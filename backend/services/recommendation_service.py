from __future__ import annotations

from datetime import datetime, timedelta
import random

from sqlalchemy.orm import Session

from ml.adaptive_recommender import AdaptiveRecommender
from ml.nlp_pipeline import embed_text
from models.models import Question, QuizAttempt, SourceTypeEnum, TopicMastery, User


recommender = AdaptiveRecommender()


def _enum_value(value: object) -> str:
    if value is None:
        return ""
    return str(getattr(value, "value", value))


def _safe_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]


def _as_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _as_datetime(value: object) -> datetime | None:
    return value if isinstance(value, datetime) else None


def _embedding_text(question: Question) -> str:
    # Include image URLs in semantic text so diagram-only duplicates are less likely.
    image_context = " ".join(_safe_list(question.question_image_urls))
    return f"{question.question_text} {image_context}".strip()


def _question_to_payload(question: Question) -> dict:
    return {
        "id": str(question.id),
        "question_text": question.question_text,
        "options": _safe_list(question.options),
        "question_image_urls": _safe_list(question.question_image_urls),
        "difficulty": str(_enum_value(question.difficulty)).lower(),
        "subject_name": question.subject.name if question.subject else "",
        "topic_name": question.topic.name if question.topic else "",
        "subtopic": question.subtopic,
    }


def _base_candidate_query(
    *,
    db: Session,
    subject_ids: list[str] | None,
    year_filter: int | None,
    source_types: list[SourceTypeEnum] | None,
):
    query = db.query(Question).filter(Question.is_verified.is_(True))
    if subject_ids:
        query = query.filter(Question.subject_id.in_(subject_ids))
    if year_filter is not None:
        query = query.filter(Question.year == int(year_filter))
    if source_types:
        query = query.filter(Question.source_type.in_(source_types))
    return query


def get_adaptive_questions(
    user: User,
    db: Session,
    *,
    subject_ids: list[str] | None = None,
    question_count: int | None = None,
    year_filter: int | None = None,
    source_types: list[SourceTypeEnum] | None = None,
) -> list[dict]:
    masteries = (
        db.query(TopicMastery)
        .filter(TopicMastery.user_id == user.id)
        .order_by(TopicMastery.weakness_score.desc())
        .all()
    )

    base_candidate_query = _base_candidate_query(
        db=db,
        subject_ids=subject_ids,
        year_filter=year_filter,
        source_types=source_types,
    )

    if not masteries:
        candidates = base_candidate_query.order_by(Question.updated_at.desc()).all()
        if question_count is not None and question_count > 0:
            candidates = candidates[:question_count]
        return [_question_to_payload(question) for question in candidates]

    topic_mastery_payload = [
        {
            "topic_id": str(mastery.topic_id),
            "topic_name": mastery.topic.name if mastery.topic else str(mastery.topic_id),
            "weakness_score": _as_float(mastery.weakness_score),
            "last_attempted_at": mastery.last_attempted_at,
        }
        for mastery in masteries
    ]

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_attempts = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id == user.id,
            QuizAttempt.started_at >= seven_days_ago,
        )
        .all()
    )

    recent_question_ids: set[str] = set()
    question_last_attempted: dict[str, datetime] = {}

    for attempt in recent_attempts:
        answers = attempt.answers or []
        if not isinstance(answers, list):
            continue
        for answer in answers:
            if not isinstance(answer, dict):
                continue
            question_id = answer.get("question_id")
            if not question_id:
                continue
            qid = str(question_id)
            recent_question_ids.add(qid)
            existing = question_last_attempted.get(qid)
            started_at = _as_datetime(attempt.started_at)
            if started_at and (existing is None or started_at > existing):
                question_last_attempted[qid] = started_at

    recent_embeddings: list[list[float]] = []
    if recent_question_ids:
        recent_questions = (
            db.query(Question)
            .filter(Question.id.in_(list(recent_question_ids)))
            .all()
        )
        recent_embeddings = [
            embed_text(_embedding_text(question))
            for question in recent_questions
        ]

    prioritized_topic_ids = [str(mastery.topic_id) for mastery in masteries[:5]]
    candidate_query = base_candidate_query
    if prioritized_topic_ids:
        candidate_query = candidate_query.filter(Question.topic_id.in_(prioritized_topic_ids))

    candidates = candidate_query.all()
    if not candidates:
        candidates = base_candidate_query.order_by(Question.updated_at.desc()).all()
        if not candidates:
            return []

    # Keep recommendation latency bounded when the pool is very large.
    if len(candidates) > 300:
        candidates = random.sample(candidates, 300)

    candidate_payloads = [
        {
            "id": str(question.id),
            "topic_id": str(question.topic_id),
            "difficulty": str(_enum_value(question.difficulty)).lower(),
            "question_text": question.question_text,
            "options": _safe_list(question.options),
            "question_image_urls": _safe_list(question.question_image_urls),
            "subject_name": question.subject.name if question.subject else "",
            "topic_name": question.topic.name if question.topic else "",
            "subtopic": question.subtopic,
            "embedding": embed_text(_embedding_text(question)),
            "last_attempted_at": question_last_attempted.get(str(question.id)),
        }
        for question in candidates
    ]

    selected = recommender.recommend(
        topic_masteries=topic_mastery_payload,
        recent_embeddings=recent_embeddings,
        candidates=candidate_payloads,
        daily_study_minutes=int(getattr(user, "daily_study_minutes", 60) or 60),
    )

    if not selected:
        return [_question_to_payload(question) for question in candidates[: max(1, question_count or 20)]]

    payload = [
        {
            "id": item["id"],
            "question_text": item["question_text"],
            "options": item["options"],
            "question_image_urls": item.get("question_image_urls", []),
            "difficulty": item["difficulty"],
            "subject_name": item.get("subject_name", ""),
            "topic_name": item.get("topic_name", ""),
            "subtopic": item.get("subtopic"),
        }
        for item in selected
    ]
    if question_count is not None and question_count > 0:
        return payload[:question_count]
    return payload
