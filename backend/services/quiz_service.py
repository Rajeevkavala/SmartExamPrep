from __future__ import annotations

from collections import defaultdict
from datetime import datetime
import random

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.models import Question, QuizAttempt, Topic
from schemas.quiz_schemas import QuizResultResponse, SubmitQuizRequest
from services.weakness_service import update_topic_mastery


def _enum_value(value: object) -> str:
    if value is None:
        return ""
    return str(getattr(value, "value", value))


def _safe_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]


def _normalize_answer(value: str) -> str:
    normalized = (value or "").strip().upper()
    if not normalized:
        return ""
    # Accept both "A" and "A. option text" formats.
    return normalized[0]


def _question_to_out(question: Question) -> dict:
    return {
        "id": str(question.id),
        "question_text": question.question_text,
        "options": _safe_list(question.options),
        "question_image_urls": _safe_list(question.question_image_urls),
        "difficulty": _enum_value(question.difficulty),
        "subject_name": question.subject.name if question.subject else "",
        "topic_name": question.topic.name if question.topic else "",
        "subtopic": question.subtopic,
    }


def get_diagnostic_questions(db: Session) -> list[dict]:
    """
    Pick up to 2 verified questions per topic while balancing difficulty.
    Preference: easy + (medium/hard) when available.
    """
    topic_ids = (
        db.query(Question.topic_id)
        .filter(Question.is_verified.is_(True))
        .distinct()
        .all()
    )
    normalized_topic_ids = [str(topic_id) for (topic_id,) in topic_ids]
    if not normalized_topic_ids:
        return []

    topics = db.query(Topic).filter(Topic.id.in_(normalized_topic_ids)).all()

    question_payloads: list[dict] = []

    for topic in topics:
        topic_questions = (
            db.query(Question)
            .filter(Question.topic_id == topic.id, Question.is_verified.is_(True))
            .all()
        )
        if not topic_questions:
            continue

        buckets: dict[str, list[Question]] = {
            "easy": [],
            "medium": [],
            "hard": [],
        }
        for question in topic_questions:
            difficulty = str(_enum_value(question.difficulty)).lower()
            if difficulty not in buckets:
                difficulty = "medium"
            buckets[difficulty].append(question)

        selected: list[Question] = []
        selected_ids: set[str] = set()

        def pick(pool: list[Question]) -> None:
            candidates = [q for q in pool if str(q.id) not in selected_ids]
            if not candidates:
                return
            chosen = random.choice(candidates)
            selected.append(chosen)
            selected_ids.add(str(chosen.id))

        pick(buckets["easy"] or buckets["medium"] or buckets["hard"])
        pick(buckets["medium"] + buckets["hard"] + buckets["easy"])

        if len(selected) < 2:
            remaining = [q for q in topic_questions if str(q.id) not in selected_ids]
            random.shuffle(remaining)
            selected.extend(remaining[: 2 - len(selected)])

        question_payloads.extend(_question_to_out(question) for question in selected[:2])

    random.shuffle(question_payloads)
    return question_payloads


async def process_quiz_submission(
    user_id: str,
    req: SubmitQuizRequest,
    db: Session,
) -> QuizResultResponse:
    if not req.answers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz submission must contain at least one answer.",
        )

    submitted_question_ids = [str(item.question_id) for item in req.answers]
    unique_question_ids = set(submitted_question_ids)

    if len(unique_question_ids) != len(submitted_question_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate question_id values are not allowed in a single submission.",
        )

    question_ids = list(unique_question_ids)

    questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="None of the submitted questions were found.",
        )

    found_question_ids = {str(question.id) for question in questions}
    missing_ids = [qid for qid in question_ids if qid not in found_question_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "One or more submitted question_id values were not found: "
                + ", ".join(missing_ids[:5])
            ),
        )

    question_lookup = {str(question.id): question for question in questions}

    answers_payload: list[dict] = []
    topic_stats: dict[str, dict[str, float]] = defaultdict(
        lambda: {"correct": 0, "total": 0, "time_sum": 0.0}
    )
    topic_names: dict[str, str] = {}

    correct_count = 0

    for item in req.answers:
        qid = str(item.question_id)
        question = question_lookup.get(qid)
        if question is None:
            continue

        selected = _normalize_answer(item.selected_answer)
        correct_answer = _normalize_answer(str(question.correct_answer))
        is_correct = selected == correct_answer

        if is_correct:
            correct_count += 1

        topic_id = str(question.topic_id)
        topic_stats[topic_id]["total"] += 1
        topic_stats[topic_id]["correct"] += 1 if is_correct else 0
        topic_stats[topic_id]["time_sum"] += float(item.time_taken_s)
        topic_names[topic_id] = question.topic.name if question.topic else topic_id

        answers_payload.append(
            {
                "question_id": qid,
                "topic_id": topic_id,
                "selected_answer": selected,
                "correct_answer": correct_answer,
                "correct": is_correct,
                "time_taken_s": float(item.time_taken_s),
                "difficulty": _enum_value(question.difficulty),
            }
        )

    total_questions = len(answers_payload)
    score = round((correct_count / total_questions) * 100, 2) if total_questions else 0.0

    attempt = QuizAttempt(
        user_id=user_id,
        quiz_type=req.quiz_type,
        score=score,
        total_questions=total_questions,
        correct_count=correct_count,
        answers=answers_payload,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    topic_scores: dict[str, float] = {}
    for topic_id, stats in topic_stats.items():
        total = int(stats["total"])
        correct = int(stats["correct"])
        avg_time = (stats["time_sum"] / total) if total > 0 else 0.0

        update_topic_mastery(
            user_id=user_id,
            topic_id=topic_id,
            correct=correct,
            total=total,
            avg_time=avg_time,
            db=db,
        )

        topic_name = topic_names.get(topic_id, topic_id)
        topic_scores[topic_name] = round((correct / total) * 100, 2) if total else 0.0

    return QuizResultResponse(
        attempt_id=str(attempt.id),
        score=score,
        correct_count=correct_count,
        total_questions=total_questions,
        topic_scores=topic_scores,
    )
