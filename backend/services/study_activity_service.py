from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.models import StudyActivityLog


def _to_int(value: object, default: int = 0) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _to_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def create_activity_log(
    *,
    user_id: str,
    activity_type: str,
    db: Session,
    activity_date: date | None = None,
    related_entity_type: str | None = None,
    related_entity_id: str | None = None,
    duration_minutes: int = 0,
    questions_solved: int = 0,
    accuracy_pct: float | None = None,
    payload: dict | None = None,
    quiz_attempt_id: str | None = None,
    daily_task_id: str | None = None,
    topic_id: str | None = None,
) -> StudyActivityLog:
    log = StudyActivityLog(
        user_id=user_id,
        activity_type=activity_type,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        duration_minutes=max(0, _to_int(duration_minutes, 0)),
        questions_solved=max(0, _to_int(questions_solved, 0)),
        accuracy_pct=(round(_to_float(accuracy_pct, 0.0), 2) if accuracy_pct is not None else None),
        activity_date=activity_date or date.today(),
        payload_json=payload or {},
        quiz_attempt_id=quiz_attempt_id,
        daily_task_id=daily_task_id,
        topic_id=topic_id,
    )
    db.add(log)
    return log


def get_activity_streak_days(user_id: str, db: Session, up_to_date: date | None = None) -> int:
    end_date = up_to_date or date.today()

    rows = (
        db.query(StudyActivityLog.activity_date)
        .filter(
            StudyActivityLog.user_id == user_id,
            StudyActivityLog.activity_date <= end_date,
        )
        .distinct()
        .order_by(StudyActivityLog.activity_date.desc())
        .all()
    )

    active_dates = [row[0] for row in rows if isinstance(row[0], date)]
    if not active_dates:
        return 0

    streak = 0
    expected_day = end_date
    for activity_day in active_dates:
        if activity_day > expected_day:
            continue
        if activity_day == expected_day:
            streak += 1
            expected_day = expected_day - timedelta(days=1)
            continue
        break

    return streak


def get_longest_activity_streak_days(user_id: str, db: Session) -> int:
    rows = (
        db.query(StudyActivityLog.activity_date)
        .filter(StudyActivityLog.user_id == user_id)
        .distinct()
        .order_by(StudyActivityLog.activity_date.asc())
        .all()
    )

    active_dates = [row[0] for row in rows if isinstance(row[0], date)]
    if not active_dates:
        return 0

    longest = 1
    current = 1

    for index in range(1, len(active_dates)):
        if active_dates[index] == active_dates[index - 1] + timedelta(days=1):
            current += 1
            longest = max(longest, current)
        else:
            current = 1

    return longest


def get_activity_heatmap(
    user_id: str,
    db: Session,
    days: int = 240,
    end_date: date | None = None,
) -> list[dict]:
    safe_days = max(1, min(365, int(days or 240)))
    last_day = end_date or date.today()
    start_date = last_day - timedelta(days=safe_days - 1)

    rows = (
        db.query(
            StudyActivityLog.activity_date,
            func.coalesce(func.sum(StudyActivityLog.duration_minutes), 0),
            func.coalesce(func.sum(StudyActivityLog.questions_solved), 0),
        )
        .filter(
            StudyActivityLog.user_id == user_id,
            StudyActivityLog.activity_date >= start_date,
            StudyActivityLog.activity_date <= last_day,
        )
        .group_by(StudyActivityLog.activity_date)
        .order_by(StudyActivityLog.activity_date.asc())
        .all()
    )

    activity_by_day = {
        row[0]: {
            "minutes": _to_int(row[1], 0),
            "questions_solved": _to_int(row[2], 0),
        }
        for row in rows
        if isinstance(row[0], date)
    }

    max_minutes = max((entry["minutes"] for entry in activity_by_day.values()), default=0)
    heatmap: list[dict] = []
    for offset in range(safe_days):
        target_day = start_date + timedelta(days=offset)
        entry = activity_by_day.get(target_day, {"minutes": 0, "questions_solved": 0})
        intensity = 0.0
        if max_minutes > 0:
            intensity = round(min(1.0, entry["minutes"] / max_minutes), 4)

        heatmap.append(
            {
                "date": target_day.isoformat(),
                "minutes": entry["minutes"],
                "questions_solved": entry["questions_solved"],
                "intensity": intensity,
            }
        )

    return heatmap


def get_activity_day_summary(user_id: str, db: Session, target_date: date | None = None) -> dict:
    day = target_date or date.today()

    aggregate_row = (
        db.query(
            func.coalesce(func.sum(StudyActivityLog.duration_minutes), 0),
            func.coalesce(func.sum(StudyActivityLog.questions_solved), 0),
            func.count(StudyActivityLog.id),
        )
        .filter(
            StudyActivityLog.user_id == user_id,
            StudyActivityLog.activity_date == day,
        )
        .first()
    )

    completed_tasks = (
        db.query(func.count(StudyActivityLog.id))
        .filter(
            StudyActivityLog.user_id == user_id,
            StudyActivityLog.activity_date == day,
            StudyActivityLog.activity_type == "planner_task_completed",
        )
        .scalar()
        or 0
    )

    minutes_spent = _to_int((aggregate_row[0] if aggregate_row else 0), 0)
    questions_solved = _to_int((aggregate_row[1] if aggregate_row else 0), 0)
    events_count = _to_int((aggregate_row[2] if aggregate_row else 0), 0)

    return {
        "activity_date": day,
        "minutes_spent": minutes_spent,
        "questions_solved": questions_solved,
        "events_count": events_count,
        "completed_tasks": _to_int(completed_tasks, 0),
    }
