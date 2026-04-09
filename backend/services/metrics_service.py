from __future__ import annotations

from datetime import date, datetime, timedelta
from statistics import mean

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.models import DailyStudyPlan, QuizAttempt, RevisionSchedule, StudyActivityLog, StudyRoadmap, TopicMastery, User
from services.dashboard_service import compute_readiness_score
from services.ai_service import generate_dashboard_focus_hint
from services.study_activity_service import (
    get_activity_heatmap,
    get_activity_streak_days,
    get_longest_activity_streak_days,
)
from services.weakness_service import get_weakness_analysis


def _to_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _iso_or_none(value: datetime | None) -> str | None:
    return value.isoformat() if isinstance(value, datetime) else None


def _freshness_label(last_activity_at: datetime | None) -> str:
    if last_activity_at is None:
        return "No recent study signal"

    age = datetime.utcnow() - last_activity_at
    if age <= timedelta(hours=24):
        return "Fresh today"
    if age <= timedelta(days=3):
        return "Updated recently"
    return "Needs a new study session"


def _topic_item(row: TopicMastery | None) -> dict | None:
    if row is None or row.topic is None:
        return None
    return {
        "topic_id": str(row.topic_id),
        "topic_name": row.topic.name,
        "subject_name": row.topic.subject.name if row.topic.subject else "",
        "accuracy": round(_to_float(row.accuracy), 2),
        "weakness_score": round(_to_float(row.weakness_score), 2),
    }


def get_analytics_overview(user_id: str, db: Session) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.completed_at.asc(), QuizAttempt.started_at.asc())
        .all()
    )
    weakness_items = get_weakness_analysis(user_id, db)

    total_quizzes_attempted = len(attempts)
    total_questions_solved = sum(int(attempt.total_questions or 0) for attempt in attempts)
    average_accuracy_pct = round(
        mean([_to_float(attempt.score) for attempt in attempts]),
        2,
    ) if attempts else 0.0

    strongest_mastery = (
        db.query(TopicMastery)
        .filter(TopicMastery.user_id == user_id)
        .order_by(TopicMastery.weakness_score.asc(), TopicMastery.accuracy.desc())
        .first()
    )
    weakest_mastery = (
        db.query(TopicMastery)
        .filter(TopicMastery.user_id == user_id)
        .order_by(TopicMastery.weakness_score.desc(), TopicMastery.accuracy.asc())
        .first()
    )

    revision_schedules = (
        db.query(RevisionSchedule)
        .filter(RevisionSchedule.user_id == user_id)
        .all()
    )
    revision_total = len(revision_schedules)
    revision_completed = sum(1 for item in revision_schedules if bool(item.is_done))
    revision_completion_rate_pct = round(
        (revision_completed / revision_total) * 100,
        2,
    ) if revision_total else 0.0

    readiness_score_current = compute_readiness_score(weakness_items)
    readiness_score_trend: list[dict] = []
    comparable_topic_changes = 0
    improved_topic_changes = 0

    for index, attempt in enumerate(attempts[-8:], start=1):
        snapshot = attempt.result_snapshot if isinstance(attempt.result_snapshot, dict) else {}
        readiness_after = snapshot.get("readiness_after")
        recorded_at = snapshot.get("submitted_at")
        if not isinstance(recorded_at, str):
            recorded_at = (
                attempt.completed_at or attempt.started_at
            ).isoformat() if (attempt.completed_at or attempt.started_at) else ""

        readiness_score = _to_float(
            readiness_after,
            default=_to_float(attempt.score),
        )
        readiness_score_trend.append(
            {
                "label": f"Attempt {index}",
                "readiness_score": round(readiness_score, 2),
                "quiz_type": str(attempt.quiz_type or ""),
                "recorded_at": recorded_at,
            }
        )

        topic_comparisons = snapshot.get("topic_comparisons", [])
        if not isinstance(topic_comparisons, list):
            continue
        for comparison in topic_comparisons:
            if not isinstance(comparison, dict):
                continue
            before = comparison.get("before")
            after = comparison.get("after")
            if not isinstance(before, dict) or not isinstance(after, dict):
                continue
            comparable_topic_changes += 1
            if _to_float(after.get("weakness_score")) < _to_float(before.get("weakness_score")):
                improved_topic_changes += 1

    readiness_score_delta_pct = round(
        readiness_score_current - readiness_score_trend[0]["readiness_score"],
        2,
    ) if readiness_score_trend else 0.0

    topic_recovery_pct = round(
        (improved_topic_changes / comparable_topic_changes) * 100,
        2,
    ) if comparable_topic_changes else 0.0

    diagnostic_attempts = [
        attempt for attempt in attempts if str(attempt.quiz_type or "").lower() == "diagnostic"
    ]
    adaptive_attempts = [
        attempt for attempt in attempts if str(attempt.quiz_type or "").lower() == "adaptive"
    ]

    diagnostic_baseline_score_pct = round(_to_float(diagnostic_attempts[0].score), 2) if diagnostic_attempts else None
    adaptive_average_score_pct = round(
        mean([_to_float(attempt.score) for attempt in adaptive_attempts]),
        2,
    ) if adaptive_attempts else None
    adaptive_improvement_pct = (
        round(adaptive_average_score_pct - diagnostic_baseline_score_pct, 2)
        if adaptive_average_score_pct is not None and diagnostic_baseline_score_pct is not None
        else None
    )

    today = date.today()
    study_streak_days = get_activity_streak_days(user_id=user_id, db=db, up_to_date=today)
    longest_streak_days = get_longest_activity_streak_days(user_id=user_id, db=db)
    activity_heatmap = get_activity_heatmap(user_id=user_id, db=db, days=240, end_date=today)

    activity_minutes_total_row = (
        db.query(func.coalesce(func.sum(StudyActivityLog.duration_minutes), 0))
        .filter(StudyActivityLog.user_id == user_id)
        .first()
    )
    total_minutes_studied = _to_float(activity_minutes_total_row[0] if activity_minutes_total_row else 0)
    hours_studied_total = round(total_minutes_studied / 60.0, 2)

    planner_completion_pct_today = 0.0
    today_plan = (
        db.query(DailyStudyPlan)
        .filter(DailyStudyPlan.user_id == user_id, DailyStudyPlan.plan_date == today)
        .first()
    )
    if today_plan is not None:
        planned_minutes = _to_float(today_plan.total_planned_minutes)
        completed_minutes = _to_float(today_plan.total_completed_minutes)
        if planned_minutes > 0:
            planner_completion_pct_today = round((completed_minutes / planned_minutes) * 100, 2)

    roadmap_progress_pct = 0.0
    active_focus_label = ""
    active_roadmap = (
        db.query(StudyRoadmap)
        .filter(StudyRoadmap.user_id == user_id, StudyRoadmap.status == "active")
        .order_by(StudyRoadmap.generated_at.desc())
        .first()
    )
    if active_roadmap is not None:
        planned_minutes_total = 0.0
        completed_minutes_total = 0.0
        for week in active_roadmap.weeks:
            week_planned = _to_float(week.planned_minutes)
            planned_minutes_total += max(0.0, week_planned)
            tracking = week.tracking_json if isinstance(week.tracking_json, dict) else {}
            completed_minutes_total += max(0.0, _to_float(tracking.get("completed_minutes")))

        if planned_minutes_total > 0:
            roadmap_progress_pct = round((completed_minutes_total / planned_minutes_total) * 100, 2)

        matching_week = next(
            (week for week in active_roadmap.weeks if week.start_date <= today <= week.end_date),
            None,
        )
        if matching_week is not None:
            active_focus_label = str(matching_week.focus_label or "")

    weakest_topic_name = weakest_mastery.topic.name if weakest_mastery and weakest_mastery.topic else "Current weak area"
    weakest_subject_name = (
        weakest_mastery.topic.subject.name
        if weakest_mastery and weakest_mastery.topic and weakest_mastery.topic.subject
        else "Core subject"
    )
    ai_insight = generate_dashboard_focus_hint(
        topic_name=weakest_topic_name,
        subject_name=weakest_subject_name,
        weakness_score=_to_float(weakest_mastery.weakness_score if weakest_mastery else 0.0),
        roadmap_focus_label=active_focus_label or "Build focus for the next study block",
        today_plan_status=today_plan.status if today_plan is not None else "missing",
    )

    latest_activity_row = (
        db.query(StudyActivityLog.created_at)
        .filter(StudyActivityLog.user_id == user_id)
        .order_by(StudyActivityLog.created_at.desc())
        .first()
    )
    latest_attempt_time = None
    if attempts:
        latest_attempt = attempts[-1]
        latest_attempt_time = latest_attempt.completed_at or latest_attempt.started_at
    last_activity_at = max(
        [
            value
            for value in [
                latest_activity_row[0] if latest_activity_row else None,
                latest_attempt_time,
            ]
            if isinstance(value, datetime)
        ],
        default=None,
    )

    if planner_completion_pct_today < 100 and today_plan is not None:
        recommended_next_step = "Finish today's planner before branching into a new quiz or revision block."
    elif weakest_mastery and weakest_mastery.topic is not None:
        recommended_next_step = f"Run one targeted practice set on {weakest_mastery.topic.name} to keep the recovery curve moving."
    elif revision_completion_rate_pct < 100:
        recommended_next_step = "Clear one due revision item so the spaced-revision queue stays trustworthy."
    else:
        recommended_next_step = "Keep the loop active with one adaptive set and one planner task today."

    if adaptive_improvement_pct is not None and adaptive_improvement_pct > 0:
        strongest_recovery_signal = (
            f"Adaptive performance is up {adaptive_improvement_pct:.1f}% versus your diagnostic baseline."
        )
    elif topic_recovery_pct > 0:
        strongest_recovery_signal = (
            f"{topic_recovery_pct:.1f}% of comparable topic snapshots are trending in the right direction."
        )
    else:
        strongest_recovery_signal = "Your learning loop needs one fresh quiz submission to establish a recovery trend."

    return {
        "total_quizzes_attempted": total_quizzes_attempted,
        "total_questions_solved": total_questions_solved,
        "average_accuracy_pct": average_accuracy_pct,
        "strongest_topic": _topic_item(strongest_mastery),
        "weakest_topic": _topic_item(weakest_mastery),
        "readiness_score_current": readiness_score_current,
        "readiness_score_delta_pct": readiness_score_delta_pct,
        "readiness_score_trend": readiness_score_trend,
        "revision_completion_rate_pct": revision_completion_rate_pct,
        "topic_recovery_pct": topic_recovery_pct,
        "diagnostic_baseline_score_pct": diagnostic_baseline_score_pct,
        "adaptive_average_score_pct": adaptive_average_score_pct,
        "adaptive_improvement_pct": adaptive_improvement_pct,
        "study_streak_days": study_streak_days,
        "longest_streak_days": longest_streak_days,
        "hours_studied_total": hours_studied_total,
        "daily_goal_minutes": int(getattr(user, "daily_study_minutes", 60) or 60),
        "activity_heatmap": activity_heatmap,
        "ai_insight": ai_insight,
        "roadmap_progress_pct": roadmap_progress_pct,
        "planner_completion_pct_today": planner_completion_pct_today,
        "freshness": {
            "generated_at": datetime.utcnow().isoformat(),
            "last_activity_at": _iso_or_none(last_activity_at),
            "freshness_label": _freshness_label(last_activity_at),
        },
        "recommended_next_step": recommended_next_step,
        "strongest_recovery_signal": strongest_recovery_signal,
    }
