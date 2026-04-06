from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta
from math import ceil
from urllib.parse import quote_plus

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from models.models import (
    RoadmapWeek,
    RoadmapWeekTopic,
    StudyRoadmap,
    Topic,
    TopicMastery,
    User,
)
from schemas.roadmap_schemas import GenerateRoadmapRequest
from services.ai_service import generate_roadmap_month_enrichment


MAX_HORIZON_WEEKS = 52
WEEKS_PER_MONTH = 4


def _to_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _to_int(value: object, default: int = 0) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _resolve_horizon_weeks(exam_target_date: date | None, start_date: date) -> int:
    if exam_target_date is None:
        return MAX_HORIZON_WEEKS

    delta_days = (exam_target_date - start_date).days
    if delta_days <= 0:
        return 1

    return max(1, min(MAX_HORIZON_WEEKS, ceil(delta_days / 7)))


def _ensure_profile_ready_for_roadmap(user: User) -> None:
    missing_fields: list[str] = []

    if not isinstance(user.exam_target_date, date) or user.exam_target_date <= date.today():
        missing_fields.append("a future exam target date")

    if not user.subject_confidences:
        missing_fields.append("at least one subject confidence")

    if missing_fields:
        missing_text = ", ".join(missing_fields)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Complete onboarding before generating a roadmap. "
                f"Missing: {missing_text}."
            ),
        )


def _normalize_resource_list(resources: object) -> list[dict]:
    if not isinstance(resources, list):
        return []

    normalized: list[dict] = []
    for item in resources:
        if not isinstance(item, dict):
            continue

        title = str(item.get("title") or "").strip()
        resource_type = str(item.get("type") or "").strip().lower()
        url = str(item.get("url") or "").strip()
        if not title or not resource_type or not url:
            continue

        normalized.append(
            {
                "title": title,
                "type": resource_type,
                "url": url,
            }
        )

    return normalized


def _default_resources(topic_name: str, goal_type: str) -> list[dict]:
    encoded = quote_plus(topic_name)
    practice_query = quote_plus(f"{topic_name} gate cse mcq")
    resource_title_prefix = topic_name.strip() or "Topic"

    if goal_type == "practice":
        primary = {
            "title": f"{resource_title_prefix} practice set",
            "type": "practice",
            "url": f"https://www.google.com/search?q={practice_query}",
        }
    elif goal_type == "revise":
        primary = {
            "title": f"{resource_title_prefix} quick revision notes",
            "type": "notes",
            "url": f"https://gateoverflow.in/search?query={encoded}",
        }
    else:
        primary = {
            "title": f"{resource_title_prefix} concept video",
            "type": "video",
            "url": f"https://www.youtube.com/results?search_query={encoded}+gate+cse",
        }

    return [
        primary,
        {
            "title": f"{resource_title_prefix} NPTEL resource",
            "type": "video",
            "url": f"https://nptel.ac.in/courses?search={encoded}",
        },
        {
            "title": f"{resource_title_prefix} notes and discussions",
            "type": "notes",
            "url": f"https://gateoverflow.in/search?query={encoded}",
        },
    ]


def _topic_plan_item(
    topic: Topic,
    mastery_by_topic: dict[str, TopicMastery],
    subject_confidence_by_subject: dict[str, int],
    known_topic_ids: set[str],
    boosted_topic_ids: set[str],
) -> dict:
    topic_id = str(topic.id)
    mastery = mastery_by_topic.get(topic_id)

    subject_confidence = subject_confidence_by_subject.get(str(topic.subject_id), 50)
    confidence_inverse = 100 - subject_confidence

    if mastery:
        weakness_score = _to_float(mastery.weakness_score, 55.0)
        measured_accuracy = _to_float(mastery.accuracy, 0.0) * 100
        total_attempts = _to_int(mastery.total_attempts, 0)
    else:
        # If no mastery exists yet, confidence and syllabus order still drive planning.
        weakness_score = max(45.0, min(85.0, confidence_inverse + 10.0))
        measured_accuracy = 0.0
        total_attempts = 0

    difficulty_weight = max(_to_float(topic.difficulty_weight, 1.0), 0.5)
    known_topic = topic_id in known_topic_ids
    boosted_topic = topic_id in boosted_topic_ids

    known_penalty = 18.0 if known_topic and weakness_score < 65 else 0.0
    no_attempt_bonus = 8.0 if total_attempts == 0 else 0.0
    prediction_boost = 18.0 if boosted_topic else 0.0
    priority_score = (
        (weakness_score * 0.55)
        + (confidence_inverse * 0.25)
        + (min(25.0, difficulty_weight * 10.0) * 0.20)
        + no_attempt_bonus
        + prediction_boost
        - known_penalty
    )
    priority_score = round(max(0.0, min(100.0, priority_score)), 2)

    if weakness_score >= 70:
        goal_type = "practice"
    elif known_topic and weakness_score < 50:
        goal_type = "revise"
    else:
        goal_type = "learn"

    planned_minutes = int(
        90
        + max(0.0, weakness_score - 50.0) * 2.0
        + max(0.0, difficulty_weight - 1.0) * 40.0
    )
    if goal_type == "practice":
        planned_minutes += 20
    elif goal_type == "revise":
        planned_minutes -= 20
    planned_minutes = max(45, min(240, planned_minutes))

    return {
        "topic": topic,
        "priority_score": priority_score,
        "planned_minutes": planned_minutes,
        "goal_type": goal_type,
        "resources": _default_resources(topic.name, goal_type),
        "rationale": {
            "weakness_score": round(weakness_score, 2),
            "measured_accuracy_pct": round(measured_accuracy, 2),
            "subject_confidence_pct": subject_confidence,
            "difficulty_weight": round(difficulty_weight, 2),
            "already_known": known_topic,
            "prediction_boosted": boosted_topic,
            "total_attempts": total_attempts,
            "explain": (
                "Priority combines weakness, low confidence, difficulty, and baseline familiarity."
            ),
        },
    }


def _build_default_day_plan(week_start: date, topics: list[dict], week_planned_minutes: int) -> list[dict]:
    if topics:
        topic_cycle = topics
    else:
        topic_cycle = [
            {
                "topic": None,
                "topic_id": None,
                "topic_name": "Consolidation",
                "goal_type": "revise",
                "resources": [
                    {
                        "title": "Consolidation notes",
                        "type": "notes",
                        "url": "https://gateoverflow.in/",
                    }
                ],
            }
        ]

    base_minutes = max(30, _to_int(week_planned_minutes / 7, 45))
    day_plan: list[dict] = []
    for day_number in range(1, 8):
        topic_item = topic_cycle[(day_number - 1) % len(topic_cycle)]
        topic_obj = topic_item.get("topic")
        topic_id = str(topic_obj.id) if topic_obj is not None else None
        topic_name = topic_obj.name if topic_obj is not None else str(topic_item.get("topic_name") or "Consolidation")
        goal_type = str(topic_item.get("goal_type") or "revise")
        resources = _normalize_resource_list(topic_item.get("resources"))

        if goal_type == "practice":
            title = f"Practice {topic_name}"
        elif goal_type == "learn":
            title = f"Learn {topic_name}"
        else:
            title = f"Revise {topic_name}"

        day_plan.append(
            {
                "day_number": day_number,
                "day_date": (week_start + timedelta(days=day_number - 1)).isoformat(),
                "title": title,
                "planned_minutes": base_minutes,
                "status": "pending",
                "completion_pct": 0.0,
                "focus_topic_ids": [topic_id] if topic_id else [],
                "resources": resources[:2],
            }
        )

    return day_plan


def _compute_week_tracking(day_plan: list[dict], planned_minutes: int) -> dict:
    total_days = len(day_plan)
    completed_days = 0
    completed_minutes = 0

    for day in day_plan:
        status = str(day.get("status") or "pending")
        if status == "completed":
            completed_days += 1

        completion_pct = _to_float(day.get("completion_pct"), 0.0)
        completion_ratio = max(0.0, min(1.0, completion_pct / 100.0))
        completed_minutes += int(_to_int(day.get("planned_minutes"), 0) * completion_ratio)

    completion_pct_total = round((completed_days / total_days) * 100, 2) if total_days else 0.0
    return {
        "completed_days": completed_days,
        "total_days": total_days,
        "completion_pct": completion_pct_total,
        "completed_minutes": completed_minutes,
        "planned_minutes": _to_int(planned_minutes, 0),
    }


def _normalize_day_plan(
    raw_days: object,
    week_start: date,
    topics_by_id: dict[str, dict],
    fallback_days: list[dict],
) -> list[dict]:
    if not isinstance(raw_days, list):
        return fallback_days

    normalized_by_day = {int(day["day_number"]): dict(day) for day in fallback_days}

    for item in raw_days:
        if not isinstance(item, dict):
            continue

        day_number = _to_int(item.get("day_number"), 0)
        if day_number < 1 or day_number > 7:
            continue

        existing = normalized_by_day.get(day_number)
        if existing is None:
            continue

        title = str(item.get("title") or "").strip()
        if title:
            existing["title"] = title

        planned_minutes = _to_int(item.get("planned_minutes"), _to_int(existing.get("planned_minutes"), 45))
        existing["planned_minutes"] = max(20, planned_minutes)

        focus_topic_ids_raw = item.get("focus_topic_ids")
        focus_topic_ids: list[str] = []
        if isinstance(focus_topic_ids_raw, list):
            for topic_id in focus_topic_ids_raw:
                normalized_topic_id = str(topic_id)
                if normalized_topic_id in topics_by_id:
                    focus_topic_ids.append(normalized_topic_id)
        if focus_topic_ids:
            existing["focus_topic_ids"] = focus_topic_ids

        resources = _normalize_resource_list(item.get("resources"))
        if not resources:
            for topic_id in focus_topic_ids:
                resources.extend(_normalize_resource_list(topics_by_id[topic_id].get("resources")))
        if resources:
            existing["resources"] = resources[:3]

        existing["status"] = "pending"
        existing["completion_pct"] = 0.0
        existing["day_date"] = (week_start + timedelta(days=day_number - 1)).isoformat()

    return [normalized_by_day[index] for index in sorted(normalized_by_day)]


def _allocate_weeks(
    prioritized_topics: list[dict],
    horizon_weeks: int,
    start_date: date,
    daily_study_minutes: int,
) -> list[dict]:
    weekly_budget = max(210, min(1260, int(max(daily_study_minutes, 30) * 7)))
    week_slots: dict[int, list[dict]] = {week: [] for week in range(1, horizon_weeks + 1)}

    if prioritized_topics:
        for index, item in enumerate(prioritized_topics):
            # Spread topics across the full horizon so early and late weeks are meaningful.
            target_week = 1 + int(index * horizon_weeks / len(prioritized_topics))
            target_week = min(max(target_week, 1), horizon_weeks)
            week_slots[target_week].append(item)

        anchors = prioritized_topics[: min(5, len(prioritized_topics))]
        for week_number in range(1, horizon_weeks + 1):
            if week_slots[week_number]:
                continue
            anchor = anchors[(week_number - 1) % len(anchors)]
            week_slots[week_number].append(
                {
                    **anchor,
                    "goal_type": "revise",
                    "planned_minutes": min(120, max(60, int(anchor["planned_minutes"] * 0.7))),
                    "priority_score": round(max(30.0, anchor["priority_score"] * 0.85), 2),
                    "rationale": {
                        **anchor["rationale"],
                        "mode": "consolidation",
                        "explain": "No new topics scheduled; this week reinforces high-impact concepts.",
                    },
                }
            )

    weeks: list[dict] = []
    for week_number in range(1, horizon_weeks + 1):
        entries = week_slots[week_number]
        week_start = start_date + timedelta(days=(week_number - 1) * 7)
        week_end = week_start + timedelta(days=6)

        subject_counts = Counter(
            str(entry["topic"].subject.name if entry["topic"].subject else "General")
            for entry in entries
        )
        focus_label = (
            f"Strengthen {subject_counts.most_common(1)[0][0]}"
            if subject_counts
            else "Consolidation and revision"
        )

        total_requested_minutes = sum(_to_int(entry["planned_minutes"], 0) for entry in entries)
        week_planned_minutes = min(weekly_budget, total_requested_minutes) if entries else 0

        topic_items: list[dict] = []
        if entries:
            per_topic_budget = max(45, week_planned_minutes // len(entries)) if week_planned_minutes else 0
            for sequence_order, entry in enumerate(entries, start=1):
                topic = entry["topic"]
                topic_items.append(
                    {
                        "topic": topic,
                        "sequence_order": sequence_order,
                        "priority_score": _to_float(entry["priority_score"], 0.0),
                        "planned_minutes": max(
                            30,
                            min(_to_int(entry["planned_minutes"], 0), per_topic_budget or _to_int(entry["planned_minutes"], 0)),
                        ),
                        "goal_type": str(entry["goal_type"]),
                        "resources": _normalize_resource_list(entry.get("resources")),
                        "rationale": dict(entry["rationale"]),
                    }
                )

        default_day_plan = _build_default_day_plan(
            week_start=week_start,
            topics=topic_items,
            week_planned_minutes=week_planned_minutes,
        )
        tracking = _compute_week_tracking(default_day_plan, week_planned_minutes)

        weeks.append(
            {
                "week_number": week_number,
                "month_number": ((week_number - 1) // 4) + 1,
                "start_date": week_start,
                "end_date": week_end,
                "planned_minutes": week_planned_minutes,
                "focus_label": focus_label,
                "status": "active" if week_number == 1 else "pending",
                "topics": topic_items,
                "day_plan": default_day_plan,
                "tracking": tracking,
            }
        )

    return weeks


def _enrich_month_with_ai(month_weeks: list[dict], daily_study_minutes: int) -> list[dict]:
    if not month_weeks:
        return month_weeks

    weekly_input = []
    for week in month_weeks:
        weekly_input.append(
            {
                "week_number": week["week_number"],
                "focus_label": week.get("focus_label"),
                "topics": [
                    {
                        "topic_id": str(topic["topic"].id),
                        "topic_name": topic["topic"].name,
                        "subject_name": topic["topic"].subject.name if topic["topic"].subject else "",
                        "goal_type": topic["goal_type"],
                        "planned_minutes": topic["planned_minutes"],
                        "priority_score": topic["priority_score"],
                    }
                    for topic in week["topics"]
                ],
            }
        )

    month_number = _to_int(month_weeks[0].get("month_number"), 1)
    month_start_date = month_weeks[0]["start_date"].isoformat()
    month_end_date = month_weeks[-1]["end_date"].isoformat()
    enrichment = generate_roadmap_month_enrichment(
        month_number=month_number,
        month_start_date=month_start_date,
        month_end_date=month_end_date,
        daily_study_minutes=daily_study_minutes,
        weekly_input=weekly_input,
    )
    if not enrichment:
        return month_weeks

    enriched_weeks_raw = enrichment.get("weeks")
    if not isinstance(enriched_weeks_raw, list):
        return month_weeks

    enriched_by_week: dict[int, dict] = {}
    for raw_week in enriched_weeks_raw:
        if not isinstance(raw_week, dict):
            continue
        week_number = _to_int(raw_week.get("week_number"), 0)
        if week_number > 0:
            enriched_by_week[week_number] = raw_week

    for week in month_weeks:
        raw_week = enriched_by_week.get(_to_int(week.get("week_number"), 0))
        if raw_week is None:
            continue

        enriched_focus = str(raw_week.get("focus_label") or "").strip()
        if enriched_focus:
            week["focus_label"] = enriched_focus

        raw_topics = raw_week.get("topics")
        resources_by_topic_id: dict[str, list[dict]] = {}
        if isinstance(raw_topics, list):
            for raw_topic in raw_topics:
                if not isinstance(raw_topic, dict):
                    continue
                topic_id = str(raw_topic.get("topic_id") or "").strip()
                if not topic_id:
                    continue
                resources = _normalize_resource_list(raw_topic.get("resources"))
                if resources:
                    resources_by_topic_id[topic_id] = resources

        for topic in week["topics"]:
            topic_id = str(topic["topic"].id)
            topic["resources"] = resources_by_topic_id.get(
                topic_id,
                _normalize_resource_list(topic.get("resources")),
            )

        topics_by_id = {
            str(topic["topic"].id): topic
            for topic in week["topics"]
        }
        week["day_plan"] = _normalize_day_plan(
            raw_days=raw_week.get("days"),
            week_start=week["start_date"],
            topics_by_id=topics_by_id,
            fallback_days=week["day_plan"],
        )
        week["tracking"] = _compute_week_tracking(week["day_plan"], week["planned_minutes"])

    return month_weeks


def _serialize_week(week: RoadmapWeek) -> dict:
    ordered_topics = sorted(week.topics, key=lambda item: item.sequence_order)
    serialized_topics = []
    for item in ordered_topics:
        serialized_topics.append(
            {
                "topic_id": str(item.topic_id),
                "topic_name": item.topic.name if item.topic else "",
                "subject_id": str(item.subject_id),
                "subject_name": item.subject.name if item.subject else "",
                "sequence_order": item.sequence_order,
                "priority_score": round(_to_float(item.priority_score, 0.0), 2),
                "planned_minutes": _to_int(item.planned_minutes, 0),
                "goal_type": item.goal_type,
                "resources": _normalize_resource_list(item.resources_json),
                "rationale": item.rationale if isinstance(item.rationale, dict) else {},
            }
        )

    day_plan = week.day_plan_json if isinstance(week.day_plan_json, list) else []
    tracking = week.tracking_json if isinstance(week.tracking_json, dict) else {}
    if not tracking:
        tracking = _compute_week_tracking(day_plan, _to_int(week.planned_minutes, 0))

    return {
        "week_number": week.week_number,
        "month_number": week.month_number,
        "start_date": week.start_date,
        "end_date": week.end_date,
        "planned_minutes": _to_int(week.planned_minutes, 0),
        "focus_label": week.focus_label,
        "status": week.status,
        "topics": serialized_topics,
        "day_plan": day_plan,
        "tracking": tracking,
    }


def _serialize_roadmap(roadmap: StudyRoadmap) -> dict:
    ordered_weeks = sorted(roadmap.weeks, key=lambda week: week.week_number)

    roadmap_start_date = (
        roadmap.start_date if isinstance(roadmap.start_date, date) else date.today()
    )
    roadmap_end_date = (
        roadmap.end_date if isinstance(roadmap.end_date, date) else roadmap_start_date
    )
    plan_horizon_weeks = max(1, _to_int(roadmap.plan_horizon_weeks, 1))

    today = date.today()
    if today < roadmap_start_date:
        current_week_number = 1
    elif today > roadmap_end_date:
        current_week_number = plan_horizon_weeks
    else:
        current_week_number = min(
            plan_horizon_weeks,
            max(1, ((today - roadmap_start_date).days // 7) + 1),
        )

    weeks_left = max(0, plan_horizon_weeks - current_week_number + 1)

    exam_target_date = (
        roadmap.user.exam_target_date
        if roadmap.user and isinstance(roadmap.user.exam_target_date, date)
        else None
    )

    generated_weeks = len(ordered_weeks)
    generated_months = ceil(generated_weeks / WEEKS_PER_MONTH) if generated_weeks else 0
    total_months = ceil(plan_horizon_weeks / WEEKS_PER_MONTH)
    has_more_months = generated_weeks < plan_horizon_weeks

    serialized_weeks = []
    total_topics = 0
    total_planned_minutes = 0

    for week in ordered_weeks:
        serialized_week = _serialize_week(week)
        total_topics += len(serialized_week["topics"])
        total_planned_minutes += _to_int(serialized_week["planned_minutes"], 0)
        serialized_weeks.append(serialized_week)

    return {
        "summary": {
            "roadmap_id": str(roadmap.id),
            "status": str(roadmap.status),
            "plan_horizon_weeks": plan_horizon_weeks,
            "generation_reason": roadmap.generation_reason,
            "generated_at": roadmap.generated_at,
            "start_date": roadmap_start_date,
            "end_date": roadmap_end_date,
            "exam_target_date": exam_target_date,
            "total_topics": total_topics,
            "total_planned_minutes": total_planned_minutes,
            "weeks_left": weeks_left,
            "generated_weeks": generated_weeks,
            "generated_months": generated_months,
            "total_months": total_months,
            "has_more_months": has_more_months,
            "next_generation_month": (generated_months + 1) if has_more_months else None,
        },
        "weeks": serialized_weeks,
    }


def _load_active_roadmap(user_id: str, db: Session) -> StudyRoadmap | None:
    return (
        db.query(StudyRoadmap)
        .options(
            joinedload(StudyRoadmap.user),
            joinedload(StudyRoadmap.weeks)
            .joinedload(RoadmapWeek.topics)
            .joinedload(RoadmapWeekTopic.topic),
            joinedload(StudyRoadmap.weeks)
            .joinedload(RoadmapWeek.topics)
            .joinedload(RoadmapWeekTopic.subject),
        )
        .filter(StudyRoadmap.user_id == user_id, StudyRoadmap.status == "active")
        .order_by(StudyRoadmap.generated_at.desc())
        .first()
    )


def _build_planning_inputs(user: User, db: Session) -> tuple[list[Topic], dict[str, TopicMastery], dict[str, int], set[str]]:
    topics = (
        db.query(Topic)
        .options(joinedload(Topic.subject))
        .order_by(Topic.display_order.asc(), Topic.name.asc())
        .all()
    )
    if not topics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate roadmap because no topics are available.",
        )

    mastery_rows = (
        db.query(TopicMastery)
        .filter(TopicMastery.user_id == user.id)
        .all()
    )
    mastery_by_topic = {str(row.topic_id): row for row in mastery_rows}

    subject_confidence_by_subject = {
        str(item.subject_id): _to_int(item.confidence_pct, 50)
        for item in user.subject_confidences
    }
    known_topic_ids = {
        str(item.topic_id)
        for item in user.topic_baselines
        if bool(item.already_known)
    }
    return topics, mastery_by_topic, subject_confidence_by_subject, known_topic_ids


def _build_full_horizon_weeks(
    user: User,
    db: Session,
    start_date: date,
    horizon_weeks: int,
    boosted_topic_ids: set[str] | None = None,
) -> list[dict]:
    topics, mastery_by_topic, subject_confidence_by_subject, known_topic_ids = _build_planning_inputs(user, db)
    boosted_ids = boosted_topic_ids or set()
    planned_topics = [
        _topic_plan_item(
            topic=topic,
            mastery_by_topic=mastery_by_topic,
            subject_confidence_by_subject=subject_confidence_by_subject,
            known_topic_ids=known_topic_ids,
            boosted_topic_ids=boosted_ids,
        )
        for topic in topics
    ]
    planned_topics.sort(key=lambda item: item["priority_score"], reverse=True)

    return _allocate_weeks(
        prioritized_topics=planned_topics,
        horizon_weeks=horizon_weeks,
        start_date=start_date,
        daily_study_minutes=_to_int(user.daily_study_minutes, 60),
    )


def _persist_week_rows(roadmap: StudyRoadmap, db: Session, weeks: list[dict]) -> None:
    for week in weeks:
        week_row = RoadmapWeek(
            roadmap_id=roadmap.id,
            week_number=week["week_number"],
            month_number=week["month_number"],
            start_date=week["start_date"],
            end_date=week["end_date"],
            planned_minutes=week["planned_minutes"],
            focus_label=week["focus_label"],
            status=week["status"],
            day_plan_json=week["day_plan"],
            tracking_json=week["tracking"],
        )
        db.add(week_row)
        db.flush()

        for topic_item in week["topics"]:
            topic = topic_item["topic"]
            db.add(
                RoadmapWeekTopic(
                    roadmap_week_id=week_row.id,
                    subject_id=topic.subject_id,
                    topic_id=topic.id,
                    sequence_order=topic_item["sequence_order"],
                    priority_score=topic_item["priority_score"],
                    planned_minutes=topic_item["planned_minutes"],
                    goal_type=topic_item["goal_type"],
                    resources_json=_normalize_resource_list(topic_item.get("resources")),
                    rationale=topic_item["rationale"],
                )
            )


def _create_new_roadmap(
    user: User,
    db: Session,
    request: GenerateRoadmapRequest,
) -> StudyRoadmap:
    start_date = request.start_date or date.today()
    exam_target_date = user.exam_target_date if isinstance(user.exam_target_date, date) else None
    horizon_weeks = _resolve_horizon_weeks(exam_target_date, start_date)
    boosted_topic_ids = {str(topic_id) for topic_id in (request.priority_topic_ids or []) if str(topic_id).strip()}
    full_horizon_weeks = _build_full_horizon_weeks(
        user=user,
        db=db,
        start_date=start_date,
        horizon_weeks=horizon_weeks,
        boosted_topic_ids=boosted_topic_ids,
    )
    first_month_weeks = full_horizon_weeks[: min(WEEKS_PER_MONTH, len(full_horizon_weeks))]
    first_month_weeks = _enrich_month_with_ai(
        month_weeks=first_month_weeks,
        daily_study_minutes=_to_int(user.daily_study_minutes, 60),
    )

    active_roadmaps = (
        db.query(StudyRoadmap)
        .filter(StudyRoadmap.user_id == user.id, StudyRoadmap.status == "active")
        .all()
    )
    for row in active_roadmaps:
        setattr(row, "status", "superseded")
        db.add(row)

    roadmap = StudyRoadmap(
        user_id=user.id,
        status="active",
        plan_horizon_weeks=horizon_weeks,
        generation_reason=request.generation_reason or "manual_generate",
        generated_at=datetime.utcnow(),
        start_date=start_date,
        end_date=start_date + timedelta(days=(horizon_weeks * 7) - 1),
        metadata_json={
            "algorithm_version": 1,
            "inputs": {
                "mode": "monthly_generation",
                "priority_topic_ids": sorted(boosted_topic_ids),
            },
        },
    )
    db.add(roadmap)
    db.flush()
    _persist_week_rows(roadmap=roadmap, db=db, weeks=first_month_weeks)

    db.commit()

    created = _load_active_roadmap(str(user.id), db)
    if created is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Roadmap generation succeeded but retrieval failed.",
        )
    return created


def _append_next_month_to_active_roadmap(user: User, db: Session, active: StudyRoadmap) -> StudyRoadmap:
    existing_week_numbers = sorted(week.week_number for week in active.weeks)
    next_start_week = (existing_week_numbers[-1] + 1) if existing_week_numbers else 1
    horizon_weeks = max(1, _to_int(active.plan_horizon_weeks, 1))

    if next_start_week > horizon_weeks:
        return active

    full_horizon_weeks = _build_full_horizon_weeks(
        user=user,
        db=db,
        start_date=active.start_date,
        horizon_weeks=horizon_weeks,
        boosted_topic_ids=set(),
    )
    next_end_week = min(horizon_weeks, next_start_week + WEEKS_PER_MONTH - 1)
    month_weeks = [
        week
        for week in full_horizon_weeks
        if next_start_week <= _to_int(week.get("week_number"), 0) <= next_end_week
    ]
    month_weeks = _enrich_month_with_ai(
        month_weeks=month_weeks,
        daily_study_minutes=_to_int(user.daily_study_minutes, 60),
    )

    existing_week_set = set(existing_week_numbers)
    month_weeks_to_insert = [
        week for week in month_weeks if _to_int(week.get("week_number"), 0) not in existing_week_set
    ]
    if not month_weeks_to_insert:
        return active

    _persist_week_rows(roadmap=active, db=db, weeks=month_weeks_to_insert)
    db.commit()

    refreshed = _load_active_roadmap(str(user.id), db)
    if refreshed is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Roadmap month generation succeeded but retrieval failed.",
        )
    return refreshed


def generate_roadmap(
    user_id: str,
    request: GenerateRoadmapRequest,
    db: Session,
) -> dict:
    user = (
        db.query(User)
        .options(joinedload(User.subject_confidences), joinedload(User.topic_baselines))
        .filter(User.id == user_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    _ensure_profile_ready_for_roadmap(user)

    active = _load_active_roadmap(user_id, db)
    if active is not None and not request.force_regenerate:
        if len(active.weeks) < _to_int(active.plan_horizon_weeks, 1):
            active = _append_next_month_to_active_roadmap(user=user, db=db, active=active)
        return _serialize_roadmap(active)

    roadmap = _create_new_roadmap(user=user, db=db, request=request)
    return _serialize_roadmap(roadmap)


def get_current_roadmap(user_id: str, db: Session) -> dict:
    roadmap = _load_active_roadmap(user_id, db)
    if roadmap is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active roadmap found. Generate one to get started.",
        )
    return _serialize_roadmap(roadmap)


def get_roadmap_week(user_id: str, week_number: int, db: Session) -> dict:
    if week_number < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="week_number must be greater than or equal to 1.",
        )

    payload = get_current_roadmap(user_id, db)
    for week in payload["weeks"]:
        if week["week_number"] == week_number:
            return week

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Week not found in the active roadmap.",
    )


def regenerate_roadmap(
    user_id: str,
    request: GenerateRoadmapRequest,
    db: Session,
) -> dict:
    req = request.model_copy(update={"force_regenerate": True})
    return generate_roadmap(user_id=user_id, request=req, db=db)


def update_roadmap_day_status(
    user_id: str,
    week_number: int,
    day_number: int,
    status_value: str,
    db: Session,
) -> dict:
    if day_number < 1 or day_number > 7:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="day_number must be between 1 and 7.",
        )

    roadmap = _load_active_roadmap(user_id, db)
    if roadmap is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active roadmap found. Generate one to get started.",
        )

    target_week = None
    for week in roadmap.weeks:
        if week.week_number == week_number:
            target_week = week
            break

    if target_week is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Week not found in the active roadmap.",
        )

    raw_day_plan = target_week.day_plan_json if isinstance(target_week.day_plan_json, list) else []
    day_plan = [
        dict(day) if isinstance(day, dict) else day
        for day in raw_day_plan
    ]
    if not day_plan:
        day_plan = _build_default_day_plan(
            week_start=target_week.start_date,
            topics=[
                {
                    "topic": item.topic,
                    "goal_type": item.goal_type,
                    "resources": _normalize_resource_list(item.resources_json),
                }
                for item in sorted(target_week.topics, key=lambda item: item.sequence_order)
            ],
            week_planned_minutes=_to_int(target_week.planned_minutes, 0),
        )

    updated = False
    for day in day_plan:
        if _to_int(day.get("day_number"), 0) != day_number:
            continue

        day["status"] = status_value
        if status_value == "completed":
            day["completion_pct"] = 100.0
        elif status_value == "in_progress":
            current = _to_float(day.get("completion_pct"), 0.0)
            day["completion_pct"] = max(10.0, min(90.0, current if current > 0 else 50.0))
        else:
            day["completion_pct"] = 0.0
        updated = True
        break

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Day not found in the selected week.",
        )

    target_week.day_plan_json = day_plan
    tracking = _compute_week_tracking(day_plan, _to_int(target_week.planned_minutes, 0))
    target_week.tracking_json = tracking

    if _to_int(tracking.get("completed_days"), 0) == _to_int(tracking.get("total_days"), 0):
        target_week.status = "completed"
    elif _to_int(tracking.get("completed_days"), 0) > 0:
        target_week.status = "active"
    else:
        target_week.status = "pending"

    db.add(target_week)
    db.commit()
    db.refresh(target_week)
    return _serialize_week(target_week)


def mark_roadmap_week_complete(
    user_id: str,
    week_number: int,
    db: Session,
) -> dict:
    roadmap = _load_active_roadmap(user_id, db)
    if roadmap is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active roadmap found. Generate one to get started.",
        )

    target_week = None
    for week in roadmap.weeks:
        if week.week_number == week_number:
            target_week = week
            break

    if target_week is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Week not found in the active roadmap.",
        )

    raw_day_plan = target_week.day_plan_json if isinstance(target_week.day_plan_json, list) else []
    day_plan = [
        dict(day) if isinstance(day, dict) else day
        for day in raw_day_plan
    ]
    if not day_plan:
        day_plan = _build_default_day_plan(
            week_start=target_week.start_date,
            topics=[
                {
                    "topic": item.topic,
                    "goal_type": item.goal_type,
                    "resources": _normalize_resource_list(item.resources_json),
                }
                for item in sorted(target_week.topics, key=lambda item: item.sequence_order)
            ],
            week_planned_minutes=_to_int(target_week.planned_minutes, 0),
        )

    total_days = 0
    already_completed_days = 0
    days_updated: list[int] = []

    for day in day_plan:
        if not isinstance(day, dict):
            continue

        day_number = _to_int(day.get("day_number"), 0)
        if day_number <= 0:
            continue

        total_days += 1
        if str(day.get("status") or "pending") == "completed":
            already_completed_days += 1
        else:
            days_updated.append(day_number)

        day["status"] = "completed"
        day["completion_pct"] = 100.0

    target_week.day_plan_json = day_plan
    tracking = _compute_week_tracking(day_plan, _to_int(target_week.planned_minutes, 0))
    target_week.tracking_json = tracking
    target_week.status = "completed"

    db.add(target_week)
    db.commit()
    db.refresh(target_week)

    return {
        "week": _serialize_week(target_week),
        "summary": {
            "requested_week_number": week_number,
            "total_days": total_days,
            "already_completed_days": already_completed_days,
            "days_updated": sorted(days_updated),
            "completion_pct": _to_float(tracking.get("completion_pct"), 0.0),
        },
    }
