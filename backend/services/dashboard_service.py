from __future__ import annotations

from datetime import date, datetime, time, timedelta
from statistics import mean

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models.models import (
    DailyStudyPlan,
    DailyStudyTask,
    QuizAttempt,
    StudyActivityLog,
    StudyRoadmap,
    Topic,
    TopicMastery,
    User,
)
from services.ai_service import generate_dashboard_focus_hint
from services.study_activity_service import get_activity_day_summary, get_activity_streak_days
from services.weakness_service import get_weakness_analysis


def _as_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _as_datetime(value: object) -> datetime | None:
    return value if isinstance(value, datetime) else None


def _as_int(value: object, default: int = 0) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
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


def _build_next_best_action(
    *,
    planner_summary: dict | None,
    roadmap_progress: dict,
    weakest_topics: list[dict],
    todays_quiz_ready: bool,
) -> str:
    if planner_summary and planner_summary.get("has_plan") and _as_float(planner_summary.get("completion_pct"), 0.0) < 100:
        focus = str(planner_summary.get("roadmap_focus_label") or "today's focus block").strip()
        return f"Finish the planner task linked to {focus} before opening another study surface."

    if weakest_topics:
        primary_topic = str(weakest_topics[0].get("topic_name") or "your weakest topic").strip()
        if todays_quiz_ready:
            return f"Take one adaptive set on {primary_topic} and let the weakness model refresh."
        return f"Open revision or PYQ practice for {primary_topic} to consolidate today's quiz feedback."

    if roadmap_progress.get("has_roadmap"):
        return "Continue your current roadmap week and log at least one focused study block."

    return "Generate your roadmap first so planner, revision, and predictor surfaces can stay in sync."


def _build_explainability_summary(
    *,
    weakest_topics: list[dict],
    planner_summary: dict | None,
    roadmap_progress: dict,
) -> str | None:
    if not weakest_topics:
        return None

    primary_topic = str(weakest_topics[0].get("topic_name") or "Current weak area").strip()
    subject_name = str(weakest_topics[0].get("subject_name") or "core subject").strip()
    planner_focus = str(planner_summary.get("roadmap_focus_label") or "").strip() if planner_summary else ""

    if planner_focus:
        return f"{primary_topic} in {subject_name} remains your main gap, and today's planner is aligned to {planner_focus}."

    if roadmap_progress.get("has_roadmap"):
        current_week = roadmap_progress.get("current_week")
        week_text = f"week {current_week}" if current_week is not None else "the current roadmap week"
        return f"{primary_topic} is still a weak area, so the platform is weighting {week_text} toward that subject cluster."

    return f"{primary_topic} is still your weakest visible topic, so new quizzes and PYQ practice should start there."


def _average_accuracy_for_day(user_id: str, target_day: date, db: Session) -> float:
    rows = (
        db.query(StudyActivityLog.accuracy_pct)
        .filter(
            StudyActivityLog.user_id == user_id,
            StudyActivityLog.activity_date == target_day,
            StudyActivityLog.accuracy_pct.isnot(None),
        )
        .all()
    )
    values = [_as_float(row[0], 0.0) for row in rows if row and row[0] is not None]
    if not values:
        return 0.0
    return round(mean(values), 2)


def compute_readiness_score(weakness_items: list[dict]) -> float:
    readiness_values = [100 - float(item["weakness_score"]) for item in weakness_items]
    return round(mean(readiness_values), 1) if readiness_values else 0.0


def _planner_summary_for_day(user_id: str, target_day: date, db: Session) -> dict | None:
    plan = (
        db.query(DailyStudyPlan)
        .options(
            joinedload(DailyStudyPlan.tasks),
            joinedload(DailyStudyPlan.roadmap_week),
        )
        .filter(
            DailyStudyPlan.user_id == user_id,
            DailyStudyPlan.plan_date == target_day,
        )
        .first()
    )
    if plan is None:
        return None

    tasks = sorted(plan.tasks or [], key=lambda task: _as_float(task.sequence_order, 0.0))
    total_tasks = len(tasks)
    completed_tasks = len([task for task in tasks if task.status == "completed"])
    pending_tasks = len([task for task in tasks if task.status in {"pending", "in_progress"}])
    has_carry_forward = any(
        task.source_type == "carry_forward" or int(task.carry_forward_count or 0) > 0
        for task in tasks
    )

    completion_pct = round((completed_tasks / total_tasks) * 100, 2) if total_tasks else 0.0
    total_planned_minutes = sum(int(task.target_minutes or 0) for task in tasks)
    total_completed_minutes = sum(
        int(task.target_minutes or 0)
        for task in tasks
        if task.status == "completed"
    )

    return {
        "has_plan": True,
        "plan_id": str(plan.id),
        "status": str(plan.status or "active"),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "completion_pct": completion_pct,
        "total_planned_minutes": total_planned_minutes,
        "total_completed_minutes": total_completed_minutes,
        "roadmap_week_number": plan.roadmap_week.week_number if plan.roadmap_week else None,
        "roadmap_focus_label": plan.roadmap_week.focus_label if plan.roadmap_week else None,
        "has_carry_forward": has_carry_forward,
    }


def _roadmap_progress_for_day(user_id: str, target_day: date, db: Session) -> dict:
    roadmap = (
        db.query(StudyRoadmap)
        .options(joinedload(StudyRoadmap.weeks))
        .filter(
            StudyRoadmap.user_id == user_id,
            StudyRoadmap.status == "active",
        )
        .order_by(StudyRoadmap.generated_at.desc())
        .first()
    )

    if roadmap is None:
        return {
            "has_roadmap": False,
            "progress_pct": 0.0,
            "current_week": None,
            "total_weeks": 0,
            "completed_weeks": 0,
            "planned_minutes_total": 0,
            "completed_minutes_total": 0,
        }

    weeks = sorted(roadmap.weeks or [], key=lambda week: _as_int(week.week_number, 0))
    total_weeks = len(weeks) if weeks else max(1, _as_int(roadmap.plan_horizon_weeks, 1))

    planned_minutes_total = 0
    completed_minutes_total = 0
    completed_weeks = 0

    for week in weeks:
        week_planned_minutes = max(0, _as_int(week.planned_minutes, 0))
        planned_minutes_total += week_planned_minutes

        tracking = week.tracking_json if isinstance(week.tracking_json, dict) else {}
        week_completed_minutes = max(0, _as_int(tracking.get("completed_minutes"), 0))

        if week_completed_minutes == 0 and isinstance(week.day_plan_json, list):
            reconstructed_minutes = 0.0
            for day_item in week.day_plan_json:
                if not isinstance(day_item, dict):
                    continue
                day_minutes = max(0, _as_int(day_item.get("planned_minutes"), 0))
                day_completion_pct = max(0.0, min(100.0, _as_float(day_item.get("completion_pct"), 0.0)))
                reconstructed_minutes += day_minutes * (day_completion_pct / 100.0)
            week_completed_minutes = int(round(reconstructed_minutes))

        completed_minutes_total += min(week_completed_minutes, week_planned_minutes or week_completed_minutes)

        completion_pct = max(0.0, min(100.0, _as_float(tracking.get("completion_pct"), 0.0)))
        if completion_pct >= 99.5 or str(week.status or "").strip().lower() == "completed":
            completed_weeks += 1

    if isinstance(roadmap.start_date, date) and isinstance(roadmap.end_date, date):
        if target_day < roadmap.start_date:
            current_week = 1
        elif target_day > roadmap.end_date:
            current_week = total_weeks
        else:
            current_week = min(total_weeks, max(1, ((target_day - roadmap.start_date).days // 7) + 1))
    else:
        current_week = 1 if total_weeks > 0 else None

    if planned_minutes_total > 0:
        progress_pct = round((completed_minutes_total / planned_minutes_total) * 100, 2)
    elif total_weeks > 0:
        progress_pct = round((completed_weeks / total_weeks) * 100, 2)
    else:
        progress_pct = 0.0

    return {
        "has_roadmap": True,
        "progress_pct": progress_pct,
        "current_week": current_week,
        "total_weeks": total_weeks,
        "completed_weeks": completed_weeks,
        "planned_minutes_total": planned_minutes_total,
        "completed_minutes_total": completed_minutes_total,
    }


def _topic_progress_summary(user_id: str, db: Session, limit: int = 6) -> list[dict]:
    task_rows = (
        db.query(DailyStudyTask)
        .join(DailyStudyPlan, DailyStudyTask.daily_plan_id == DailyStudyPlan.id)
        .filter(
            DailyStudyPlan.user_id == user_id,
            DailyStudyTask.topic_id.isnot(None),
        )
        .all()
    )

    topic_minutes_map: dict[str, dict[str, int]] = {}
    for task in task_rows:
        topic_id = str(task.topic_id) if task.topic_id is not None else ""
        if not topic_id:
            continue
        bucket = topic_minutes_map.setdefault(topic_id, {"planned": 0, "completed": 0})
        task_minutes = max(0, _as_int(task.target_minutes, 0))
        bucket["planned"] += task_minutes
        if str(task.status or "") == "completed":
            bucket["completed"] += task_minutes

    masteries = db.query(TopicMastery).filter(TopicMastery.user_id == user_id).all()

    topic_progress: list[dict] = []
    seen_topic_ids: set[str] = set()
    for mastery in masteries:
        if mastery.topic is None or mastery.topic.subject is None:
            continue

        topic_id = str(mastery.topic_id)
        seen_topic_ids.add(topic_id)
        minute_stats = topic_minutes_map.get(topic_id, {"planned": 0, "completed": 0})

        accuracy = _as_float(mastery.accuracy, 0.0)
        accuracy_pct = accuracy * 100 if accuracy <= 1.0 else accuracy

        topic_progress.append(
            {
                "topic_id": topic_id,
                "topic_name": mastery.topic.name,
                "subject_name": mastery.topic.subject.name,
                "mastery_level": str(getattr(mastery.mastery_level, "value", mastery.mastery_level or "Moderate")),
                "weakness_score": round(_as_float(mastery.weakness_score, 0.0), 2),
                "accuracy_pct": round(accuracy_pct, 2),
                "total_attempts": _as_int(mastery.total_attempts, 0),
                "planned_minutes": minute_stats["planned"],
                "completed_minutes": minute_stats["completed"],
            }
        )

    unresolved_topic_ids = [
        topic_id
        for topic_id in topic_minutes_map
        if topic_id not in seen_topic_ids
    ]
    if unresolved_topic_ids:
        extra_topics = (
            db.query(Topic)
            .filter(Topic.id.in_(unresolved_topic_ids))
            .all()
        )
        for topic in extra_topics:
            if topic.subject is None:
                continue
            topic_id = str(topic.id)
            minute_stats = topic_minutes_map.get(topic_id, {"planned": 0, "completed": 0})
            topic_progress.append(
                {
                    "topic_id": topic_id,
                    "topic_name": topic.name,
                    "subject_name": topic.subject.name,
                    "mastery_level": "Moderate",
                    "weakness_score": 50.0,
                    "accuracy_pct": 0.0,
                    "total_attempts": 0,
                    "planned_minutes": minute_stats["planned"],
                    "completed_minutes": minute_stats["completed"],
                }
            )

    topic_progress.sort(
        key=lambda item: (
            _as_float(item.get("weakness_score"), 0.0),
            _as_int(item.get("planned_minutes"), 0),
            -_as_float(item.get("accuracy_pct"), 0.0),
        ),
        reverse=True,
    )
    return topic_progress[:limit]


def _build_quick_actions(
    *,
    planner_summary: dict | None,
    roadmap_progress: dict,
    todays_quiz_ready: bool,
) -> list[dict]:
    has_plan = bool(planner_summary and planner_summary.get("has_plan"))
    has_roadmap = bool(roadmap_progress.get("has_roadmap"))

    return [
        {
            "label": "Continue Today's Planner" if has_plan else "Generate Today's Planner",
            "href": "/planner",
            "description": "Complete today's scheduled study tasks.",
            "variant": "primary" if has_plan else "accent",
        },
        {
            "label": "View Roadmap" if has_roadmap else "Generate Roadmap",
            "href": "/roadmap",
            "description": "Track weekly study progress and focus areas.",
            "variant": "secondary",
        },
        {
            "label": "Take Adaptive Quiz" if todays_quiz_ready else "Practice Again",
            "href": "/quiz/adaptive",
            "description": "Reinforce weak topics with adaptive questions.",
            "variant": "success",
        },
        {
            "label": "Browse PYQs",
            "href": "/pyq",
            "description": "Practice verified previous-year questions with filters.",
            "variant": "secondary",
        },
        {
            "label": "Ask Study Chat",
            "href": "/chat",
            "description": "Get grounded help from your roadmap, planner, and weak topics.",
            "variant": "accent",
        },
        {
            "label": "Open Revision Plan",
            "href": "/revision",
            "description": "Review due spaced-revision topics.",
            "variant": "neutral",
        },
        {
            "label": "Share Feedback",
            "href": "/feedback",
            "description": "Tell us how your current learning flow feels.",
            "variant": "neutral",
        },
    ]


def get_dashboard_data(user_id: str, db: Session) -> dict:
    weakness_items = get_weakness_analysis(user_id, db)
    readiness_score = compute_readiness_score(weakness_items)
    today = datetime.utcnow().date()
    user = db.query(User).filter(User.id == user_id).first()

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

    activity_summary = get_activity_day_summary(user_id=user_id, db=db, target_date=today)
    planner_summary = _planner_summary_for_day(user_id=user_id, target_day=today, db=db)
    roadmap_progress = _roadmap_progress_for_day(user_id=user_id, target_day=today, db=db)
    topic_progress = _topic_progress_summary(user_id=user_id, db=db)
    study_streak_days = get_activity_streak_days(user_id=user_id, db=db, up_to_date=today)
    previous_week_streak = get_activity_streak_days(
        user_id=user_id,
        db=db,
        up_to_date=today - timedelta(days=7),
    )
    current_accuracy = _average_accuracy_for_day(user_id=user_id, target_day=today, db=db)
    previous_accuracy = _average_accuracy_for_day(
        user_id=user_id,
        target_day=today - timedelta(days=1),
        db=db,
    )

    attempt_totals = (
        db.query(
            func.coalesce(func.sum(QuizAttempt.total_questions), 0),
        )
        .filter(QuizAttempt.user_id == user_id)
        .first()
    )
    total_questions_from_attempts = _as_int((attempt_totals[0] if attempt_totals else 0), 0)

    activity_totals = (
        db.query(
            func.coalesce(func.sum(StudyActivityLog.duration_minutes), 0),
            func.coalesce(func.sum(StudyActivityLog.questions_solved), 0),
        )
        .filter(StudyActivityLog.user_id == user_id)
        .first()
    )
    total_minutes_studied = _as_int((activity_totals[0] if activity_totals else 0), 0)
    total_questions_from_activity = _as_int((activity_totals[1] if activity_totals else 0), 0)

    questions_solved_total = max(total_questions_from_attempts, total_questions_from_activity)
    hours_studied_total = round(total_minutes_studied / 60.0, 2)
    questions_goal_today = max(10, int(round((_as_int(getattr(user, "daily_study_minutes", 60), 60) / 3.0))))

    if planner_summary and planner_summary.get("has_plan"):
        status_badge_label = "Study plan active"
    elif roadmap_progress.get("has_roadmap"):
        status_badge_label = "Roadmap active"
    else:
        status_badge_label = "Build your plan"

    todays_quiz_ready = todays_attempt_count == 0
    quick_actions = _build_quick_actions(
        planner_summary=planner_summary,
        roadmap_progress=roadmap_progress,
        todays_quiz_ready=todays_quiz_ready,
    )

    nlp_insight: str | None = None
    if weakest_topics:
        primary_topic = weakest_topics[0]
        nlp_insight = generate_dashboard_focus_hint(
            topic_name=str(primary_topic.get("topic_name") or "Current weak area"),
            subject_name=str(primary_topic.get("subject_name") or "Core subject"),
            weakness_score=_as_float(primary_topic.get("weakness_score"), 0.0),
            roadmap_focus_label=(
                str(planner_summary.get("roadmap_focus_label") or "")
                if planner_summary
                else ""
            ),
            today_plan_status=(
                str(planner_summary.get("status") or "missing")
                if planner_summary
                else "missing"
            ),
        )

    latest_activity_at = (
        db.query(StudyActivityLog.created_at)
        .filter(StudyActivityLog.user_id == user_id)
        .order_by(StudyActivityLog.created_at.desc())
        .first()
    )
    latest_attempt_at = (
        db.query(QuizAttempt.completed_at, QuizAttempt.started_at)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.completed_at.desc(), QuizAttempt.started_at.desc())
        .first()
    )
    candidate_times = [
        _as_datetime(latest_activity_at[0]) if latest_activity_at else None,
        _as_datetime(latest_attempt_at[0]) if latest_attempt_at else None,
        _as_datetime(latest_attempt_at[1]) if latest_attempt_at else None,
        _as_datetime(getattr(user, "updated_at", None)) if user is not None else None,
    ]
    last_activity_at = max([value for value in candidate_times if value is not None], default=None)
    freshness = {
        "generated_at": datetime.utcnow().isoformat(),
        "last_activity_at": _iso_or_none(last_activity_at),
        "freshness_label": _freshness_label(last_activity_at),
    }

    return {
        "readiness_score": readiness_score,
        "weakest_topics": weakest_topics,
        "strongest_topics": strongest_topics,
        "subjects_progress": subjects_progress,
        "recent_scores": recent_scores,
        "todays_quiz_ready": todays_quiz_ready,
        "study_streak_days": study_streak_days,
        "study_streak_delta_vs_last_week": int(study_streak_days - previous_week_streak),
        "minutes_studied_today": int(activity_summary.get("minutes_spent", 0)),
        "questions_solved_today": int(activity_summary.get("questions_solved", 0)),
        "questions_goal_today": questions_goal_today,
        "accuracy_delta_vs_yesterday": round(current_accuracy - previous_accuracy, 2),
        "activity_events_today": int(activity_summary.get("events_count", 0)),
        "questions_solved_total": questions_solved_total,
        "hours_studied_total": hours_studied_total,
        "status_badge_label": status_badge_label,
        "roadmap_progress": roadmap_progress,
        "roadmap_progress_pct": _as_float(roadmap_progress.get("progress_pct"), 0.0),
        "roadmap_current_week": _as_int(roadmap_progress.get("current_week"), 0)
        if roadmap_progress.get("current_week") is not None
        else None,
        "today_plan_status": (
            str(planner_summary.get("status") or "missing")
            if planner_summary
            else "missing"
        ),
        "topic_progress": topic_progress,
        "quick_actions": quick_actions,
        "planner_summary": planner_summary,
        "nlp_insight": nlp_insight,
        "freshness": freshness,
        "next_best_action": _build_next_best_action(
            planner_summary=planner_summary,
            roadmap_progress=roadmap_progress,
            weakest_topics=weakest_topics,
            todays_quiz_ready=todays_quiz_ready,
        ),
        "explainability_summary": _build_explainability_summary(
            weakest_topics=weakest_topics,
            planner_summary=planner_summary,
            roadmap_progress=roadmap_progress,
        ),
    }
