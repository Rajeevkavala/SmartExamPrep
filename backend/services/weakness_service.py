from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from ml.spaced_revision import RevisionInput, SpacedRevisionScheduler
from ml.weakness_detector import WeaknessDetector
from models.models import (
    MasteryLevelEnum,
    RevisionSchedule,
    Subject,
    Topic,
    TopicMastery,
)


detector = WeaknessDetector(use_ml_model=False)
scheduler = SpacedRevisionScheduler()


def update_topic_mastery(
    user_id: str,
    topic_id: str,
    correct: int,
    total: int,
    avg_time: float,
    db: Session,
    *,
    commit: bool = True,
) -> dict:
    mastery = (
        db.query(TopicMastery)
        .filter(TopicMastery.user_id == user_id, TopicMastery.topic_id == topic_id)
        .first()
    )
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    if mastery is None:
        mastery = TopicMastery(
            user_id=user_id,
            topic_id=topic_id,
            total_attempts=0,
            correct_attempts=0,
            accuracy=0.0,
            weakness_score=50.0,
            mastery_level=MasteryLevelEnum.moderate,
        )
        db.add(mastery)

    mastery.total_attempts = int(mastery.total_attempts or 0) + max(0, total)
    mastery.correct_attempts = int(mastery.correct_attempts or 0) + max(0, correct)
    mastery.accuracy = (
        mastery.correct_attempts / mastery.total_attempts if mastery.total_attempts > 0 else 0.0
    )
    mastery.avg_response_time_s = float(avg_time)
    mastery.last_attempted_at = datetime.utcnow()

    features = WeaknessDetector.extract_features_from_db(user_id, topic_id, db)
    
    from main import weakness_detector
    
    if weakness_detector is not None:
        result = weakness_detector.compute(features)
    else:
        # Fallback if accessed outside lifespan (e.g. testing)
        fallback_detector = WeaknessDetector(use_ml_model=False)
        result = fallback_detector.compute(features)
        
    mastery.weakness_score = result["weakness_score"]
    mastery.mastery_level = _as_mastery_enum(result["mastery_level"])

    revision = (
        db.query(RevisionSchedule)
        .filter(RevisionSchedule.user_id == user_id, RevisionSchedule.topic_id == topic_id)
        .first()
    )
    if revision is None:
        revision = RevisionSchedule(
            user_id=user_id,
            topic_id=topic_id,
            due_date=datetime.utcnow(),
            interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            last_score_pct=0.0,
            is_done=False,
        )
        db.add(revision)

    score_pct = (correct / total) * 100 if total > 0 else 0.0
    schedule_result = scheduler.schedule(
        RevisionInput(
            topic_id=topic_id,
            last_score_pct=score_pct,
            previous_interval_days=int(revision.interval_days or 1),
            ease_factor=float(revision.ease_factor or 2.5),
            repetition_count=int(revision.repetition_count or 0),
            topic_difficulty_weight=float(topic.difficulty_weight if topic else 1.0),
        )
    )

    revision.due_date = schedule_result["due_date"]
    revision.interval_days = schedule_result["interval_days"]
    revision.ease_factor = schedule_result["ease_factor"]
    revision.repetition_count = schedule_result["repetition_count"]
    revision.last_score_pct = score_pct
    revision.is_done = False

    mastery.next_revision_date = schedule_result["due_date"]

    if commit:
        db.commit()
    else:
        db.flush()

    mastery_level_value = getattr(mastery.mastery_level, "value", mastery.mastery_level)

    return {
        "weakness_score": mastery.weakness_score,
        "mastery_level": mastery_level_value,
        "next_revision_date": revision.due_date,
    }


def get_weakness_analysis(user_id: str, db: Session) -> list[dict]:
    rows = (
        db.query(TopicMastery)
        .join(Topic, Topic.id == TopicMastery.topic_id)
        .join(Subject, Subject.id == Topic.subject_id)
        .filter(TopicMastery.user_id == user_id)
        .order_by(TopicMastery.weakness_score.desc())
        .all()
    )

    response: list[dict] = []
    for mastery in rows:
        response.append(
            {
                "topic_id": str(mastery.topic_id),
                "topic_name": mastery.topic.name if mastery.topic else "",
                "subject_name": (
                    mastery.topic.subject.name if mastery.topic and mastery.topic.subject else ""
                ),
                "weakness_score": round(float(mastery.weakness_score or 0.0), 2),
                "mastery_level": getattr(mastery.mastery_level, "value", mastery.mastery_level),
                "accuracy": round(float(mastery.accuracy or 0.0), 2),
                "total_attempts": int(mastery.total_attempts or 0),
                "updated_at": (
                    mastery.updated_at.isoformat() + "Z"
                    if isinstance(mastery.updated_at, datetime)
                    else None
                ),
            }
        )

    return response


def _as_mastery_enum(value: str) -> MasteryLevelEnum:
    normalized = (value or "").strip().lower()
    if normalized == "strong":
        return MasteryLevelEnum.strong
    if normalized == "weak":
        return MasteryLevelEnum.weak
    return MasteryLevelEnum.moderate
