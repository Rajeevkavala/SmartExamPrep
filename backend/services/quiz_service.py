from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
import random

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.models import DailyStudyTask, MockQuizSession, Question, QuizAttempt, SourceTypeEnum, Topic, User
from schemas.quiz_schemas import CreateMockSessionRequest, QuizResultResponse, SubmitQuizRequest
from services.dashboard_service import compute_readiness_score
from services.exam_service import get_exam_or_404
from services.study_activity_service import create_activity_log
from services.weakness_service import get_weakness_analysis
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


def _to_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _refresh_daily_plan_progress(plan: object) -> None:
    tasks = getattr(plan, "tasks", None)
    if not isinstance(tasks, list):
        return

    total_planned = 0
    total_completed = 0
    actionable = 0
    completed = 0

    for task in tasks:
        task_minutes = _to_float(getattr(task, "target_minutes", 0), 0.0)
        total_planned += max(0, int(task_minutes))

        task_status = str(getattr(task, "status", "pending") or "pending")
        if task_status in {"pending", "in_progress", "completed"}:
            actionable += 1

        if task_status == "completed":
            completed += 1
            total_completed += max(0, int(task_minutes))

    setattr(plan, "total_planned_minutes", total_planned)
    setattr(plan, "total_completed_minutes", total_completed)
    if actionable > 0 and completed == actionable:
        setattr(plan, "status", "completed")
    else:
        setattr(plan, "status", "active")


def _complete_planner_task_from_context(user_id: str, context_payload: dict | None, db: Session) -> bool:
    if not isinstance(context_payload, dict):
        return False

    daily_task_id = context_payload.get("daily_task_id")
    if not daily_task_id:
        return False

    task = (
        db.query(DailyStudyTask)
        .filter(DailyStudyTask.id == str(daily_task_id))
        .first()
    )
    if task is None or task.daily_plan is None:
        return False
    if str(task.daily_plan.user_id) != str(user_id):
        return False

    updated = False
    if str(task.status) != "completed":
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        db.add(task)
        updated = True

    plan = task.daily_plan
    _refresh_daily_plan_progress(plan)
    db.add(plan)
    return updated


def _complete_mock_session_from_context(user_id: str, context_payload: dict | None, db: Session) -> bool:
    if not isinstance(context_payload, dict):
        return False

    mock_session_id = context_payload.get("mock_session_id")
    if not mock_session_id:
        return False

    session = (
        db.query(MockQuizSession)
        .filter(MockQuizSession.id == str(mock_session_id), MockQuizSession.user_id == user_id)
        .first()
    )
    if session is None:
        return False

    updated = str(session.status) != "completed"
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    db.add(session)
    return updated


def _normalize_snapshot(item: dict) -> dict:
    return {
        "topic_id": str(item.get("topic_id", "")),
        "topic_name": str(item.get("topic_name", "")),
        "subject_name": str(item.get("subject_name", "")),
        "weakness_score": round(_to_float(item.get("weakness_score")), 2),
        "mastery_level": str(item.get("mastery_level", "Moderate")),
        "accuracy": round(_to_float(item.get("accuracy")), 2),
    }


def _build_topic_comparisons(
    topic_scores: dict[str, float],
    topic_ids_by_name: dict[str, str],
    before_weakness: list[dict],
    after_weakness: list[dict],
) -> list[dict]:
    before_by_id = {
        str(item.get("topic_id")): _normalize_snapshot(item)
        for item in before_weakness
        if isinstance(item, dict) and item.get("topic_id")
    }
    after_by_id = {
        str(item.get("topic_id")): _normalize_snapshot(item)
        for item in after_weakness
        if isinstance(item, dict) and item.get("topic_id")
    }

    comparisons: list[dict] = []
    for topic_name, score in topic_scores.items():
        topic_id = topic_ids_by_name.get(topic_name, topic_name)
        before = before_by_id.get(topic_id)
        after = after_by_id.get(topic_id)
        subject_name = ""
        if after:
            subject_name = after["subject_name"]
        elif before:
            subject_name = before["subject_name"]

        comparisons.append(
            {
                "topic_id": topic_id,
                "topic_name": topic_name,
                "subject_name": subject_name,
                "topic_score_pct": round(_to_float(score), 2),
                "before": before,
                "after": after,
            }
        )
    return comparisons


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


def _ordered_question_payloads(question_ids: list[str], db: Session) -> list[dict]:
    if not question_ids:
        return []

    questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
    questions_by_id = {str(question.id): question for question in questions}
    ordered_questions = [questions_by_id[qid] for qid in question_ids if qid in questions_by_id]
    return [_question_to_out(question) for question in ordered_questions]


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


def _fetch_mock_questions(
    *,
    user: User,
    exam_subject_ids: list[str],
    mock_type: str,
    question_count: int,
    year_filter: int | None,
    db: Session,
) -> list[dict]:
    normalized_mock_type = mock_type.strip().lower() or "adaptive"

    if normalized_mock_type == "adaptive":
        from services.recommendation_service import get_adaptive_questions

        source_types = [SourceTypeEnum.PYQ] if year_filter is not None else None
        questions = get_adaptive_questions(
            user,
            db,
            subject_ids=exam_subject_ids,
            question_count=question_count,
            year_filter=year_filter,
            source_types=source_types,
        )
        return questions[:question_count]

    candidate_query = db.query(Question).filter(Question.is_verified.is_(True))
    if exam_subject_ids:
        candidate_query = candidate_query.filter(Question.subject_id.in_(exam_subject_ids))

    if normalized_mock_type == "pyq" or year_filter is not None:
        candidate_query = candidate_query.filter(Question.source_type == SourceTypeEnum.PYQ)
    if year_filter is not None:
        candidate_query = candidate_query.filter(Question.year == int(year_filter))

    candidates = candidate_query.all()
    if not candidates:
        return []

    random.shuffle(candidates)
    selected = candidates[:question_count]
    return [_question_to_out(question) for question in selected]


def create_mock_session(
    user_id: str,
    req: CreateMockSessionRequest,
    db: Session,
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    exam = get_exam_or_404(db, req.exam_id)
    exam_subject_ids = [
        str(subject_id)
        for subject_id in (exam.subject_ids or [])
        if str(subject_id).strip()
    ]

    questions = _fetch_mock_questions(
        user=user,
        exam_subject_ids=exam_subject_ids,
        mock_type=req.mock_type,
        question_count=int(req.question_count),
        year_filter=req.year_filter,
        db=db,
    )
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No questions matched the selected mock session filters.",
        )

    context_payload = {
        "source": "mock_test",
        "exam_id": str(exam.id),
        "exam_title": exam.title,
        "mock_type": req.mock_type,
        "session_mode": req.session_mode,
        "question_count": int(req.question_count),
        "time_limit_seconds": int(req.time_limit_seconds),
        "year_filter": req.year_filter,
    }

    session = MockQuizSession(
        user_id=user_id,
        exam_id=exam.id,
        mock_type=req.mock_type,
        session_mode=req.session_mode,
        time_limit_seconds=int(req.time_limit_seconds),
        question_count=int(req.question_count),
        year_filter=req.year_filter,
        context_payload=context_payload,
        question_ids=[str(question["id"]) for question in questions],
        status="ready",
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    response_context = dict(context_payload)
    response_context["mock_session_id"] = str(session.id)

    return {
        "session_id": str(session.id),
        "exam_id": str(exam.id),
        "exam_title": exam.title,
        "mock_type": req.mock_type,
        "session_mode": req.session_mode,
        "time_limit_seconds": int(req.time_limit_seconds),
        "question_count": len(questions),
        "year_filter": req.year_filter,
        "questions": questions,
        "context_payload": response_context,
        "created_at": session.created_at.isoformat() if session.created_at else "",
    }


def get_mock_session(user_id: str, session_id: str, db: Session) -> dict:
    session = (
        db.query(MockQuizSession)
        .filter(MockQuizSession.id == session_id, MockQuizSession.user_id == user_id)
        .first()
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mock session not found.",
        )

    if session.expires_at is not None and session.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Mock session expired. Please create a new one.",
        )

    exam = get_exam_or_404(db, str(session.exam_id)) if session.exam_id else None
    questions = _ordered_question_payloads(
        [str(question_id) for question_id in (session.question_ids or [])],
        db,
    )
    context_payload = dict(session.context_payload or {})
    context_payload["mock_session_id"] = str(session.id)

    return {
        "session_id": str(session.id),
        "exam_id": str(session.exam_id) if session.exam_id else "",
        "exam_title": exam.title if exam is not None else str(context_payload.get("exam_title") or ""),
        "mock_type": session.mock_type,
        "session_mode": session.session_mode,
        "time_limit_seconds": int(session.time_limit_seconds or 0),
        "question_count": len(questions),
        "year_filter": session.year_filter,
        "questions": questions,
        "context_payload": context_payload,
        "created_at": session.created_at.isoformat() if session.created_at else "",
    }


def get_attempt_history(user_id: str, source: str | None, db: Session, limit: int = 20) -> dict:
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.completed_at.desc(), QuizAttempt.started_at.desc())
        .all()
    )

    serialized: list[dict] = []
    for attempt in attempts:
        context_payload = attempt.context_payload if isinstance(attempt.context_payload, dict) else {}
        attempt_source = str(context_payload.get("source") or "")
        if source and attempt_source != source:
            continue

        submitted_at = attempt.completed_at or attempt.started_at or datetime.utcnow()
        year_filter_value = context_payload.get("year_filter")
        serialized.append(
            {
                "attempt_id": str(attempt.id),
                "quiz_type": str(attempt.quiz_type or ""),
                "score": round(_to_float(attempt.score), 2),
                "correct_count": int(attempt.correct_count or 0),
                "total_questions": int(attempt.total_questions or 0),
                "source": attempt_source or None,
                "exam_id": str(context_payload.get("exam_id") or "") or None,
                "exam_title": str(context_payload.get("exam_title") or "") or None,
                "mock_type": str(context_payload.get("mock_type") or "") or None,
                "year_filter": int(year_filter_value) if year_filter_value is not None else None,
                "submitted_at": submitted_at.isoformat(),
            }
        )

    safe_limit = max(limit, 1)
    return {"attempts": serialized[:safe_limit], "total": len(serialized)}


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

    before_weakness = get_weakness_analysis(user_id, db)
    readiness_before = compute_readiness_score(before_weakness)
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

    submission_time = datetime.utcnow()
    attempt = QuizAttempt(
        user_id=user_id,
        quiz_type=req.quiz_type,
        score=score,
        total_questions=total_questions,
        correct_count=correct_count,
        answers=answers_payload,
        context_payload=req.context_payload or {},
        started_at=submission_time,
        completed_at=submission_time,
    )
    db.add(attempt)
    db.flush()

    topic_scores: dict[str, float] = {}
    topic_ids_by_name: dict[str, str] = {}
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
            commit=False,
        )

        topic_name = topic_names.get(topic_id, topic_id)
        topic_scores[topic_name] = round((correct / total) * 100, 2) if total else 0.0
        topic_ids_by_name[topic_name] = topic_id

    after_weakness = get_weakness_analysis(user_id, db)
    readiness_after = compute_readiness_score(after_weakness)
    topic_comparisons = _build_topic_comparisons(
        topic_scores=topic_scores,
        topic_ids_by_name=topic_ids_by_name,
        before_weakness=before_weakness,
        after_weakness=after_weakness,
    )

    submitted_at = (attempt.completed_at or attempt.started_at or datetime.utcnow()).isoformat()
    analysis_updated_at = datetime.utcnow().isoformat() + "Z"
    planner_task_completed = _complete_planner_task_from_context(
        user_id=str(user_id),
        context_payload=req.context_payload or {},
        db=db,
    )
    mock_session_completed = _complete_mock_session_from_context(
        user_id=str(user_id),
        context_payload=req.context_payload or {},
        db=db,
    )
    result_metadata = {
        "analysis_updated_at": analysis_updated_at,
        "mastery_records_updated": len(topic_stats),
        "planner_task_completed": planner_task_completed,
        "mock_session_completed": mock_session_completed,
    }
    attempt.result_snapshot = {
        "quiz_type": req.quiz_type,
        "topic_scores": topic_scores,
        "topic_comparisons": topic_comparisons,
        "readiness_before": readiness_before,
        "readiness_after": readiness_after,
        "submitted_at": submitted_at,
        "analysis_updated_at": analysis_updated_at,
        "result_metadata": result_metadata,
        "context_payload": req.context_payload or {},
    }

    duration_minutes = int(sum(_to_float(item.get("time_taken_s"), 0.0) for item in answers_payload) / 60)
    create_activity_log(
        user_id=str(user_id),
        activity_type="quiz_submitted",
        db=db,
        related_entity_type="quiz_attempt",
        related_entity_id=str(attempt.id),
        duration_minutes=max(0, duration_minutes),
        questions_solved=total_questions,
        accuracy_pct=score,
        payload={
            "quiz_type": req.quiz_type,
            "context_payload": req.context_payload or {},
            "readiness_before": readiness_before,
            "readiness_after": readiness_after,
        },
        quiz_attempt_id=str(attempt.id),
    )

    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return QuizResultResponse(
        attempt_id=str(attempt.id),
        quiz_type=req.quiz_type,
        score=score,
        correct_count=correct_count,
        total_questions=total_questions,
        topic_scores=topic_scores,
        topic_comparisons=topic_comparisons,
        readiness_before=readiness_before,
        readiness_after=readiness_after,
        submitted_at=submitted_at,
        analysis_updated_at=analysis_updated_at,
        result_metadata=result_metadata,
        context_payload=req.context_payload or {},
    )


def get_attempt_result(user_id: str, attempt_id: str, db: Session) -> dict:
    attempt = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id)
        .first()
    )
    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz attempt not found.",
        )

    snapshot = attempt.result_snapshot if isinstance(attempt.result_snapshot, dict) else {}
    topic_scores = snapshot.get("topic_scores")
    if not isinstance(topic_scores, dict):
        topic_scores = {}
        answers = attempt.answers if isinstance(attempt.answers, list) else []
        topic_totals: dict[str, dict[str, int]] = defaultdict(lambda: {"correct": 0, "total": 0})
        topic_names_by_id: dict[str, str] = {}

        topic_ids = {
            str(item.get("topic_id"))
            for item in answers
            if isinstance(item, dict) and item.get("topic_id")
        }
        topics = db.query(Topic).filter(Topic.id.in_(list(topic_ids))).all() if topic_ids else []
        topic_names_by_id = {str(topic.id): topic.name for topic in topics}

        for answer in answers:
            if not isinstance(answer, dict):
                continue
            topic_id = str(answer.get("topic_id", ""))
            if not topic_id:
                continue
            topic_totals[topic_id]["total"] += 1
            topic_totals[topic_id]["correct"] += 1 if bool(answer.get("correct")) else 0

        for topic_id, stats in topic_totals.items():
            topic_name = topic_names_by_id.get(topic_id, topic_id)
            total = stats["total"]
            topic_scores[topic_name] = round((stats["correct"] / total) * 100, 2) if total else 0.0

    topic_comparisons = snapshot.get("topic_comparisons", [])
    if not isinstance(topic_comparisons, list):
        topic_comparisons = []

    submitted_at = snapshot.get("submitted_at")
    if not isinstance(submitted_at, str):
        submitted_at = (
            attempt.completed_at or attempt.started_at or datetime.utcnow()
        ).isoformat()

    return {
        "attempt_id": str(attempt.id),
        "quiz_type": str(snapshot.get("quiz_type") or attempt.quiz_type),
        "score": round(_to_float(attempt.score), 2),
        "correct_count": int(attempt.correct_count or 0),
        "total_questions": int(attempt.total_questions or 0),
        "topic_scores": topic_scores,
        "topic_comparisons": topic_comparisons,
        "readiness_before": snapshot.get("readiness_before"),
        "readiness_after": snapshot.get("readiness_after"),
        "submitted_at": submitted_at,
        "analysis_updated_at": snapshot.get("analysis_updated_at"),
        "result_metadata": snapshot.get("result_metadata")
        if isinstance(snapshot.get("result_metadata"), dict)
        else {},
        "context_payload": snapshot.get("context_payload")
        if isinstance(snapshot.get("context_payload"), dict)
        else attempt.context_payload,
    }
