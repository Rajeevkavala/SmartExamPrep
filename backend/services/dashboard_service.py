from __future__ import annotations

from datetime import datetime, time
from statistics import mean

from sqlalchemy.orm import Session

from models.models import QuizAttempt, TopicMastery
from services.weakness_service import get_weakness_analysis


def _as_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _as_datetime(value: object) -> datetime | None:
    return value if isinstance(value, datetime) else None


def get_dashboard_data(user_id: str, db: Session) -> dict:
    weakness_items = get_weakness_analysis(user_id, db)

    readiness_values = [100 - float(item["weakness_score"]) for item in weakness_items]
    readiness_score = round(mean(readiness_values), 1) if readiness_values else 0.0

    weakest_topics = sorted(
        weakness_items,
        key=lambda item: float(item["weakness_score"]),
        reverse=True,
    )[:3]
    strongest_topics = sorted(
        weakness_items,
        key=lambda item: float(item["weakness_score"]),
    )[:3]

    masteries = (
        db.query(TopicMastery)
        .filter(TopicMastery.user_id == user_id)
        .all()
    )

    subjects_progress_map: dict[str, dict[str, float]] = {}
    for mastery in masteries:
        if mastery.topic is None or mastery.topic.subject is None:
            continue

        subject_name = mastery.topic.subject.name
        bucket = subjects_progress_map.setdefault(
            subject_name,
            {"accuracy_sum": 0.0, "count": 0.0},
        )
        bucket["accuracy_sum"] += _as_float(mastery.accuracy)
        bucket["count"] += 1.0

    subjects_progress = [
        {
            "subject_name": subject_name,
            "accuracy": round(
                values["accuracy_sum"] / values["count"],
                2,
            ),
        }
        for subject_name, values in subjects_progress_map.items()
        if values["count"] > 0
    ]
    subjects_progress.sort(key=lambda item: item["subject_name"])

    recent_attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.started_at.desc())
        .limit(5)
        .all()
    )
    recent_scores = [
        {
            "score": round(_as_float(attempt.score), 2),
            "date": (
                _as_datetime(attempt.started_at)
                or _as_datetime(attempt.completed_at)
                or datetime.utcnow()
            ).isoformat(),
        }
        for attempt in recent_attempts
    ]

    today_start = datetime.combine(datetime.utcnow().date(), time.min)
    todays_attempt_count = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id, QuizAttempt.started_at >= today_start)
        .count()
    )

    return {
        "readiness_score": readiness_score,
        "weakest_topics": weakest_topics,
        "strongest_topics": strongest_topics,
        "subjects_progress": subjects_progress,
        "recent_scores": recent_scores,
        "todays_quiz_ready": todays_attempt_count == 0,
        "nlp_insight": None,
    }
