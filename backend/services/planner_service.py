from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, cast

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from models.models import (
    DailyStudyPlan,
    DailyStudyTask,
    RevisionSchedule,
    RoadmapWeek,
    RoadmapWeekTopic,
    StudyRoadmap,
    Topic,
    User,
)
from schemas.planner_schemas import GenerateTodayPlanRequest
from services.recommendation_service import get_adaptive_questions
from services.study_activity_service import create_activity_log


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


def _load_user_or_404(user_id: str, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


def _carry_forward_origin_id(task: Any) -> str:
    payload = (
        task.source_payload
        if isinstance(getattr(task, "source_payload", None), dict)
        else {}
    )
    return str(payload.get("from_task_id") or task.id)


def _carry_forward_title(title: object) -> str:
    clean_title = str(title or "Study task").strip()
    prefix = "Carry forward: "
    if clean_title.lower().startswith(prefix.lower()):
        return clean_title
    return f"{prefix}{clean_title}"


def _existing_task_signature(task: Any) -> str:
    payload = (
        task.source_payload
        if isinstance(getattr(task, "source_payload", None), dict)
        else {}
    )
    origin_id = payload.get("from_task_id")
    if origin_id:
        return f"carry:{origin_id}"

    task_type = str(getattr(task, "task_type", "") or "")
    topic_id = str(getattr(task, "topic_id", "") or "")
    title = str(getattr(task, "title", "") or "")
    return f"task:{task_type}:{topic_id}:{title}"


def _load_plan(user_id: str, plan_date: date, db: Session) -> Any | None:
    return (
        db.query(DailyStudyPlan)
        .options(
            joinedload(DailyStudyPlan.tasks).joinedload(DailyStudyTask.subject),
            joinedload(DailyStudyPlan.tasks).joinedload(DailyStudyTask.topic),
            joinedload(DailyStudyPlan.roadmap_week),
        )
        .filter(
            DailyStudyPlan.user_id == user_id,
            DailyStudyPlan.plan_date == plan_date,
        )
        .first()
    )


def _get_active_roadmap_for_date(user_id: str, target_date: date, db: Session) -> tuple[Any | None, Any | None]:
    roadmap = (
        db.query(StudyRoadmap)
        .options(
            joinedload(StudyRoadmap.weeks)
            .joinedload(RoadmapWeek.topics)
            .joinedload(RoadmapWeekTopic.topic),
            joinedload(StudyRoadmap.weeks)
            .joinedload(RoadmapWeek.topics)
            .joinedload(RoadmapWeekTopic.subject),
        )
        .filter(
            StudyRoadmap.user_id == user_id,
            StudyRoadmap.status == "active",
        )
        .order_by(StudyRoadmap.generated_at.desc())
        .first()
    )
    if roadmap is None:
        return None, None

    for week in roadmap.weeks:
        if isinstance(week.start_date, date) and isinstance(week.end_date, date):
            if week.start_date <= target_date <= week.end_date:
                return roadmap, week

    if roadmap.weeks:
        nearest_week = sorted(roadmap.weeks, key=lambda row: row.week_number)[0]
        return roadmap, nearest_week

    return roadmap, None


def _build_revision_tasks(user_id: str, target_date: date, db: Session) -> list[dict]:
    schedules = (
        db.query(RevisionSchedule)
        .options(joinedload(RevisionSchedule.topic).joinedload(Topic.subject))
        .filter(
            RevisionSchedule.user_id == user_id,
            RevisionSchedule.is_done.is_(False),
            RevisionSchedule.due_date <= datetime.combine(target_date, datetime.max.time()),
        )
        .order_by(RevisionSchedule.due_date.asc())
        .limit(3)
        .all()
    )

    tasks: list[dict] = []
    for schedule in schedules:
        due_date_value = cast(datetime | None, schedule.due_date)
        topic_name = schedule.topic.name if schedule.topic else "Topic revision"
        subject_name = (
            schedule.topic.subject.name
            if schedule.topic and schedule.topic.subject
            else None
        )
        target_minutes = max(20, min(50, (_to_int(schedule.interval_days, 1) * 10)))

        tasks.append(
            {
                "task_type": "revision",
                "source_type": "revision_schedule",
                "subject_id": str(schedule.topic.subject_id) if schedule.topic else None,
                "subject_name": subject_name,
                "topic_id": str(schedule.topic_id),
                "topic_name": topic_name,
                "title": f"Revise {topic_name}",
                "description": (
                    f"Due now based on spaced repetition. Last score: {round(_to_float(schedule.last_score_pct, 0.0), 1)}%."
                ),
                "resource_hint": None,
                "target_question_count": None,
                "target_minutes": target_minutes,
                "source_payload": {
                    "revision_schedule_id": str(schedule.id),
                    "due_date": due_date_value.isoformat() if due_date_value is not None else None,
                    "interval_days": _to_int(schedule.interval_days, 0),
                },
            }
        )

    return tasks


def _task_type_from_goal(goal_type: str | None) -> str:
    normalized = str(goal_type or "").strip().lower()
    if normalized in {"revise", "revision"}:
        return "revision"
    if normalized in {"practice", "quiz"}:
        return "practice"
    return "learn"


def _build_roadmap_tasks(week: Any | None, target_date: date) -> list[dict]:
    if week is None:
        return []

    tasks: list[dict] = []
    day_number = ((target_date - week.start_date).days + 1) if isinstance(week.start_date, date) else 1

    raw_day_plan = week.day_plan_json
    day_plan: list[dict[str, Any]] = [
        item for item in raw_day_plan if isinstance(item, dict)
    ] if isinstance(raw_day_plan, list) else []
    roadmap_topics = sorted(week.topics, key=lambda item: item.sequence_order)
    topic_by_id = {str(item.topic_id): item for item in roadmap_topics}

    selected_days: list[dict[str, Any]] = [
        item
        for item in day_plan
        if _to_int(item.get("day_number"), 0) == day_number
    ]

    if not selected_days and len(day_plan) > 0:
        selected_days = day_plan[:1]

    if selected_days:
        for day in selected_days:
            raw_focus_topic_ids = day.get("focus_topic_ids")
            focus_topic_ids: list[Any] = raw_focus_topic_ids if isinstance(raw_focus_topic_ids, list) else []
            first_topic_id = str(focus_topic_ids[0]) if focus_topic_ids else None
            mapped = topic_by_id.get(first_topic_id) if first_topic_id else None

            resources = day.get("resources") if isinstance(day.get("resources"), list) else []
            resource_hint = None
            if resources and isinstance(resources[0], dict):
                resource_hint = str(resources[0].get("url") or resources[0].get("title") or "") or None

            tasks.append(
                {
                    "task_type": _task_type_from_goal(mapped.goal_type if mapped else None),
                    "source_type": "roadmap",
                    "subject_id": str(mapped.subject_id) if mapped else None,
                    "subject_name": mapped.subject.name if mapped and mapped.subject else None,
                    "topic_id": str(mapped.topic_id) if mapped else first_topic_id,
                    "topic_name": mapped.topic.name if mapped and mapped.topic else None,
                    "title": str(day.get("title") or "Roadmap focus"),
                    "description": f"Roadmap week {week.week_number}: {week.focus_label or 'Focused study block'}.",
                    "resource_hint": resource_hint,
                    "target_question_count": None,
                    "target_minutes": max(20, _to_int(day.get("planned_minutes"), 45)),
                    "source_payload": {
                        "roadmap_week_id": str(week.id),
                        "roadmap_week_number": week.week_number,
                        "day_number": _to_int(day.get("day_number"), 0),
                        "resources": resources,
                        "focus_topic_ids": [str(topic_id) for topic_id in focus_topic_ids],
                    },
                }
            )

    if tasks:
        return tasks

    fallback_tasks: list[dict] = []
    for item in roadmap_topics[:2]:
        resources = item.resources_json if isinstance(item.resources_json, list) else []
        resource_hint = None
        if resources and isinstance(resources[0], dict):
            resource_hint = str(resources[0].get("url") or resources[0].get("title") or "") or None

        fallback_tasks.append(
            {
                "task_type": _task_type_from_goal(item.goal_type),
                "source_type": "roadmap",
                "subject_id": str(item.subject_id),
                "subject_name": item.subject.name if item.subject else None,
                "topic_id": str(item.topic_id),
                "topic_name": item.topic.name if item.topic else None,
                "title": f"Roadmap focus: {item.topic.name if item.topic else 'Topic'}",
                "description": f"Planned from roadmap week {week.week_number}.",
                "resource_hint": resource_hint,
                "target_question_count": None,
                "target_minutes": max(25, _to_int(item.planned_minutes, 45)),
                "source_payload": {
                    "roadmap_week_id": str(week.id),
                    "roadmap_week_number": week.week_number,
                    "goal_type": item.goal_type,
                    "priority_score": _to_float(item.priority_score, 0.0),
                },
            }
        )

    return fallback_tasks


def _build_practice_task(user: User, db: Session, remaining_minutes: int) -> list[dict]:
    if remaining_minutes < 20:
        return []

    recommended_questions = get_adaptive_questions(user, db)
    if not recommended_questions:
        return []

    question_ids = [str(item.get("id")) for item in recommended_questions if item.get("id")]
    recommended_topics = []
    for item in recommended_questions:
        topic_name = str(item.get("topic_name") or "").strip()
        if topic_name and topic_name not in recommended_topics:
            recommended_topics.append(topic_name)
        if len(recommended_topics) >= 3:
            break

    target_count = max(5, min(10, len(question_ids)))
    target_minutes = max(20, min(remaining_minutes, target_count * 4))

    return [
        {
            "task_type": "practice",
            "source_type": "adaptive_recommendation",
            "subject_id": None,
            "subject_name": None,
            "topic_id": None,
            "topic_name": recommended_topics[0] if recommended_topics else None,
            "title": "Solve adaptive practice set",
            "description": "Target weak and stale topics with focused adaptive practice.",
            "resource_hint": "/quiz/adaptive",
            "target_question_count": target_count,
            "target_minutes": target_minutes,
            "source_payload": {
                "question_ids": question_ids[:target_count],
                "recommended_topics": recommended_topics,
            },
        }
    ]


def _build_carry_forward_tasks(user_id: str, target_date: date, db: Session) -> list[dict]:
    previous_plan = (
        db.query(DailyStudyPlan)
        .options(joinedload(DailyStudyPlan.tasks))
        .filter(
            DailyStudyPlan.user_id == user_id,
            DailyStudyPlan.plan_date < target_date,
        )
        .order_by(DailyStudyPlan.plan_date.desc())
        .first()
    )
    if previous_plan is None:
        return []

    carry_tasks: list[dict] = []
    for task in sorted(previous_plan.tasks, key=lambda row: row.sequence_order):
        if task.status not in {"pending", "in_progress"}:
            continue
        if _to_int(task.carry_forward_count, 0) >= 2:
            continue
        origin_task_id = _carry_forward_origin_id(task)

        carry_tasks.append(
            {
                "task_type": task.task_type,
                "source_type": "carry_forward",
                "subject_id": str(task.subject_id) if task.subject_id else None,
                "subject_name": None,
                "topic_id": str(task.topic_id) if task.topic_id else None,
                "topic_name": None,
                "title": _carry_forward_title(task.title),
                "description": task.description,
                "resource_hint": task.resource_hint,
                "target_question_count": task.target_question_count,
                "target_minutes": task.target_minutes,
                "source_payload": {
                    "from_plan_id": str(previous_plan.id),
                    "from_task_id": origin_task_id,
                },
                "carry_forward_count": _to_int(task.carry_forward_count, 0) + 1,
            }
        )

        if len(carry_tasks) >= 3:
            break

    return carry_tasks


def _create_plan(
    *,
    user: Any,
    plan_date: date,
    roadmap: Any | None,
    week: Any | None,
    task_payloads: list[dict],
    carry_forward_from_plan_id: str | None,
    db: Session,
) -> Any:
    total_planned_minutes = sum(max(0, _to_int(item.get("target_minutes"), 0)) for item in task_payloads)

    plan = DailyStudyPlan(
        user_id=str(user.id),
        roadmap_id=str(roadmap.id) if roadmap else None,
        roadmap_week_id=str(week.id) if week else None,
        plan_date=plan_date,
        status="active",
        total_planned_minutes=total_planned_minutes,
        total_completed_minutes=0,
        carry_forward_from_plan_id=carry_forward_from_plan_id,
        metadata_json={
            "generation_reason": "manual_generate_today",
            "daily_study_minutes": _to_int(user.daily_study_minutes, 60),
        },
        generated_at=datetime.utcnow(),
    )
    db.add(plan)
    db.flush()

    sequence_order = 1
    for item in task_payloads:
        task = DailyStudyTask(
            daily_plan_id=str(plan.id),
            task_type=str(item.get("task_type") or "learn"),
            source_type=str(item.get("source_type") or "planner"),
            subject_id=item.get("subject_id"),
            topic_id=item.get("topic_id"),
            title=str(item.get("title") or "Study task"),
            description=item.get("description"),
            resource_hint=item.get("resource_hint"),
            target_question_count=(
                _to_int(item.get("target_question_count"), 0)
                if item.get("target_question_count") is not None
                else None
            ),
            target_minutes=(
                _to_int(item.get("target_minutes"), 0)
                if item.get("target_minutes") is not None
                else None
            ),
            sequence_order=sequence_order,
            status="pending",
            carry_forward_count=_to_int(item.get("carry_forward_count"), 0),
            source_payload=item.get("source_payload") or {},
        )
        db.add(task)
        sequence_order += 1

    return plan


def _refresh_plan_progress(plan: Any) -> None:
    completed_minutes = 0
    total_planned = 0
    completed_count = 0
    actionable_count = 0

    for task in plan.tasks:
        task_minutes = _to_int(task.target_minutes, 0)
        total_planned += max(0, task_minutes)

        if task.status == "completed":
            completed_count += 1
            completed_minutes += max(0, task_minutes)

        if task.status in {"pending", "in_progress", "completed"}:
            actionable_count += 1

    plan.total_planned_minutes = total_planned
    plan.total_completed_minutes = completed_minutes

    if actionable_count > 0 and completed_count == actionable_count:
        plan.status = "completed"
    elif completed_count > 0:
        plan.status = "active"
    else:
        plan.status = "active"


def _serialize_plan(plan: Any) -> dict:
    ordered_tasks = sorted(plan.tasks, key=lambda item: item.sequence_order)

    tasks = []
    completed_tasks = 0
    pending_tasks = 0
    has_carry_forward = False

    for task in ordered_tasks:
        if task.status == "completed":
            completed_tasks += 1
        elif task.status in {"pending", "in_progress"}:
            pending_tasks += 1

        if _to_int(task.carry_forward_count, 0) > 0 or task.source_type == "carry_forward":
            has_carry_forward = True

        tasks.append(
            {
                "task_id": str(task.id),
                "task_type": task.task_type,
                "source_type": task.source_type,
                "subject_id": str(task.subject_id) if task.subject_id is not None else None,
                "subject_name": task.subject.name if task.subject else None,
                "topic_id": str(task.topic_id) if task.topic_id is not None else None,
                "topic_name": task.topic.name if task.topic else None,
                "title": task.title,
                "description": task.description,
                "resource_hint": task.resource_hint,
                "target_question_count": task.target_question_count,
                "target_minutes": _to_int(task.target_minutes, 0) if task.target_minutes is not None else None,
                "sequence_order": _to_int(task.sequence_order, 0),
                "status": task.status,
                "completed_at": task.completed_at,
                "carry_forward_count": _to_int(task.carry_forward_count, 0),
                "source_payload": task.source_payload if isinstance(task.source_payload, dict) else {},
            }
        )

    total_tasks = len(tasks)
    completion_pct = round((completed_tasks / total_tasks) * 100, 2) if total_tasks else 0.0

    return {
        "plan_id": str(plan.id),
        "plan_date": plan.plan_date,
        "status": plan.status,
        "total_planned_minutes": _to_int(plan.total_planned_minutes, 0),
        "total_completed_minutes": _to_int(plan.total_completed_minutes, 0),
        "completion_pct": completion_pct,
        "generated_at": plan.generated_at,
        "roadmap_id": str(plan.roadmap_id) if plan.roadmap_id is not None else None,
        "roadmap_week_id": str(plan.roadmap_week_id) if plan.roadmap_week_id is not None else None,
        "roadmap_week_number": (
            _to_int(plan.roadmap_week.week_number, 0)
            if plan.roadmap_week is not None
            else None
        ),
        "roadmap_focus_label": (
            plan.roadmap_week.focus_label
            if plan.roadmap_week is not None
            else None
        ),
        "carry_forward_from_plan_id": (
            str(plan.carry_forward_from_plan_id)
            if plan.carry_forward_from_plan_id is not None
            else None
        ),
        "has_carry_forward": has_carry_forward,
        "summary": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "completion_pct": completion_pct,
            "total_planned_minutes": _to_int(plan.total_planned_minutes, 0),
            "total_completed_minutes": _to_int(plan.total_completed_minutes, 0),
        },
        "tasks": tasks,
    }


def _generate_plan_for_date(user_id: str, plan_date: date, request: GenerateTodayPlanRequest, db: Session) -> DailyStudyPlan:
    user = _load_user_or_404(user_id, db)

    roadmap, week = _get_active_roadmap_for_date(user_id=user_id, target_date=plan_date, db=db)

    task_payloads: list[dict] = []
    carry_forward_from_plan_id = None

    if request.include_carry_forward:
        carry_forward_tasks = _build_carry_forward_tasks(user_id=user_id, target_date=plan_date, db=db)
        if carry_forward_tasks:
            carry_forward_from_plan_id = str(carry_forward_tasks[0]["source_payload"].get("from_plan_id"))
            task_payloads.extend(carry_forward_tasks)

    task_payloads.extend(_build_revision_tasks(user_id=user_id, target_date=plan_date, db=db))
    task_payloads.extend(_build_roadmap_tasks(week=week, target_date=plan_date))

    planned_minutes = sum(max(0, _to_int(item.get("target_minutes"), 0)) for item in task_payloads)
    daily_budget = max(60, _to_int(user.daily_study_minutes, 60))
    remaining_minutes = max(0, daily_budget - planned_minutes)
    task_payloads.extend(_build_practice_task(user=user, db=db, remaining_minutes=remaining_minutes))

    if not task_payloads:
        task_payloads.append(
            {
                "task_type": "learn",
                "source_type": "planner",
                "subject_id": None,
                "topic_id": None,
                "title": "Warm-up study block",
                "description": "Spend 30 minutes revisiting your weakest topic from the dashboard.",
                "resource_hint": "/dashboard",
                "target_question_count": None,
                "target_minutes": 30,
                "source_payload": {"mode": "fallback"},
            }
        )

    plan = _create_plan(
        user=user,
        plan_date=plan_date,
        roadmap=roadmap,
        week=week,
        task_payloads=task_payloads,
        carry_forward_from_plan_id=carry_forward_from_plan_id,
        db=db,
    )

    db.commit()
    db.refresh(plan)

    loaded = _load_plan(user_id=user_id, plan_date=plan_date, db=db)
    if loaded is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Planner generation succeeded but retrieval failed.",
        )
    return loaded


def get_today_plan(user_id: str, db: Session, auto_generate: bool = True) -> dict:
    today = date.today()
    plan = _load_plan(user_id=user_id, plan_date=today, db=db)

    if plan is None and auto_generate:
        plan = _generate_plan_for_date(
            user_id=user_id,
            plan_date=today,
            request=GenerateTodayPlanRequest(force_regenerate=False, include_carry_forward=True),
            db=db,
        )

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No daily plan found for today.",
        )

    _refresh_plan_progress(plan)
    db.add(plan)
    db.commit()
    db.refresh(plan)

    loaded = _load_plan(user_id=user_id, plan_date=today, db=db)
    if loaded is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load planner data.",
        )

    return _serialize_plan(loaded)


def generate_today_plan(user_id: str, request: GenerateTodayPlanRequest, db: Session) -> dict:
    today = date.today()
    existing = _load_plan(user_id=user_id, plan_date=today, db=db)

    if existing is not None and not request.force_regenerate:
        _refresh_plan_progress(existing)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        loaded = _load_plan(user_id=user_id, plan_date=today, db=db)
        if loaded is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to load planner data.",
            )
        return _serialize_plan(loaded)

    if existing is not None and request.force_regenerate:
        db.delete(existing)
        db.commit()

    plan = _generate_plan_for_date(user_id=user_id, plan_date=today, request=request, db=db)
    return _serialize_plan(plan)


def update_task_status(user_id: str, task_id: str, status_value: str, db: Session) -> dict:
    task = (
        db.query(DailyStudyTask)
        .options(joinedload(DailyStudyTask.daily_plan))
        .filter(DailyStudyTask.id == task_id)
        .first()
    )
    if task is None or task.daily_plan is None or str(task.daily_plan.user_id) != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner task not found.")

    task_obj = cast(Any, task)
    previous_status = str(task_obj.status)
    task_obj.status = status_value
    if status_value == "completed":
        task_obj.completed_at = datetime.utcnow()
    elif status_value in {"pending", "in_progress", "skipped"}:
        task_obj.completed_at = None

    plan = cast(Any, task.daily_plan)
    _refresh_plan_progress(plan)

    if previous_status != "completed" and status_value == "completed":
        create_activity_log(
            user_id=user_id,
            activity_type="planner_task_completed",
            db=db,
            related_entity_type="daily_study_task",
            related_entity_id=str(task.id),
            duration_minutes=_to_int(task.target_minutes, 0),
            questions_solved=_to_int(task.target_question_count, 0),
            payload={
                "task_type": task.task_type,
                "source_type": task.source_type,
                "title": task.title,
            },
            daily_task_id=str(task.id),
            topic_id=str(task.topic_id) if task.topic_id is not None else None,
        )

    db.add(task)
    db.add(plan)
    db.commit()

    updated_plan = _load_plan(user_id=user_id, plan_date=plan.plan_date, db=db)
    if updated_plan is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Task update succeeded but planner retrieval failed.",
        )

    return _serialize_plan(updated_plan)


def carry_forward_tasks(user_id: str, from_date: date | None, db: Session) -> dict:
    today = date.today()
    target_plan = _load_plan(user_id=user_id, plan_date=today, db=db)
    if target_plan is None:
        target_plan = _generate_plan_for_date(
            user_id=user_id,
            plan_date=today,
            request=GenerateTodayPlanRequest(force_regenerate=False, include_carry_forward=False),
            db=db,
        )

    source_date = from_date or (today - timedelta(days=1))
    source_plan = _load_plan(user_id=user_id, plan_date=source_date, db=db)
    if source_plan is None:
        return _serialize_plan(target_plan)

    existing_signatures = {
        _existing_task_signature(task)
        for task in target_plan.tasks
    }

    next_sequence = (
        max((_to_int(task.sequence_order, 0) for task in target_plan.tasks), default=0) + 1
    )

    for task in sorted(source_plan.tasks, key=lambda row: row.sequence_order):
        if task.status not in {"pending", "in_progress"}:
            continue
        if _to_int(task.carry_forward_count, 0) >= 2:
            continue
        origin_task_id = _carry_forward_origin_id(task)

        signature = f"carry:{origin_task_id}"
        if signature in existing_signatures:
            continue

        carried = DailyStudyTask(
            daily_plan_id=str(target_plan.id),
            task_type=task.task_type,
            source_type="carry_forward",
            subject_id=task.subject_id,
            topic_id=task.topic_id,
            title=_carry_forward_title(task.title),
            description=task.description,
            resource_hint=task.resource_hint,
            target_question_count=task.target_question_count,
            target_minutes=task.target_minutes,
            sequence_order=next_sequence,
            status="pending",
            carry_forward_count=_to_int(task.carry_forward_count, 0) + 1,
            source_payload={
                "from_plan_id": str(source_plan.id),
                "from_task_id": origin_task_id,
            },
        )
        db.add(carried)
        next_sequence += 1
        existing_signatures.add(signature)

    cast(Any, target_plan).carry_forward_from_plan_id = str(source_plan.id)
    _refresh_plan_progress(target_plan)
    db.add(target_plan)
    db.commit()

    loaded = _load_plan(user_id=user_id, plan_date=today, db=db)
    if loaded is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Carry-forward succeeded but planner retrieval failed.",
        )

    return _serialize_plan(loaded)


def get_today_planner_summary(user_id: str, db: Session) -> dict:
    today = date.today()
    plan = _load_plan(user_id=user_id, plan_date=today, db=db)
    if plan is None:
        return {
            "has_plan": False,
            "plan_date": today,
            "status": "missing",
            "total_tasks": 0,
            "completed_tasks": 0,
            "pending_tasks": 0,
            "completion_pct": 0.0,
            "total_planned_minutes": 0,
            "total_completed_minutes": 0,
            "roadmap_week_number": None,
            "roadmap_focus_label": None,
            "has_carry_forward": False,
        }

    payload = _serialize_plan(plan)
    summary = payload["summary"]
    return {
        "has_plan": True,
        "plan_id": payload["plan_id"],
        "plan_date": payload["plan_date"],
        "status": payload["status"],
        "total_tasks": summary["total_tasks"],
        "completed_tasks": summary["completed_tasks"],
        "pending_tasks": summary["pending_tasks"],
        "completion_pct": summary["completion_pct"],
        "total_planned_minutes": payload["total_planned_minutes"],
        "total_completed_minutes": payload["total_completed_minutes"],
        "roadmap_week_number": payload.get("roadmap_week_number"),
        "roadmap_focus_label": payload.get("roadmap_focus_label"),
        "has_carry_forward": payload.get("has_carry_forward", False),
    }
