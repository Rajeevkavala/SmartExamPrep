from __future__ import annotations

from datetime import date, datetime
import re
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ml.nlp_pipeline import extract_tags
from models.models import (
    DailyStudyPlan,
    DailyStudyTask,
    QuizAttempt,
    RevisionSchedule,
    RoadmapWeek,
    RoadmapWeekTopic,
    StudyChatMessage,
    StudyChatSession,
    StudyRoadmap,
    Topic,
    TopicMastery,
    User,
)
from schemas.study_chat_schemas import CreateChatSessionRequest
from services.ai_service import generate_study_chat_reply


INTENT_CONTEXT_MAP = {
    "concept_help": "concept",
    "weak_topic_help": "weak_topic",
    "roadmap_help": "roadmap",
    "planner_help": "planner",
    "pyq_help": "pyq",
    "general_study_help": "general",
}


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


def _normalize_role(value: object) -> str:
    role = str(value or "user").strip().lower()
    if role not in {"user", "assistant", "system"}:
        return "user"
    return role


def _clean_text(value: object, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text if text else fallback


def _safe_dict(value: object) -> dict:
    return value if isinstance(value, dict) else {}


def _serialize_message(message: StudyChatMessage) -> dict:
    return {
        "id": str(message.id),
        "role": _normalize_role(message.role),
        "message_text": _clean_text(message.message_text),
        "grounding_snapshot_json": _safe_dict(message.grounding_snapshot_json)
        if message.grounding_snapshot_json is not None
        else None,
        "token_usage_json": _safe_dict(message.token_usage_json)
        if message.token_usage_json is not None
        else None,
        "created_at": message.created_at or datetime.utcnow(),
    }


def _session_messages_sorted(session: StudyChatSession) -> list[StudyChatMessage]:
    return sorted(
        session.messages,
        key=lambda item: item.created_at or datetime.min,
    )


def _serialize_session_summary(session: StudyChatSession) -> dict:
    messages = _session_messages_sorted(session)
    preview = None
    if messages:
        preview = _clean_text(messages[-1].message_text)[:120] or None

    return {
        "session_id": str(session.id),
        "title": _clean_text(session.title, "New Study Chat"),
        "context_type": _clean_text(session.context_type, "general"),
        "last_used_at": session.last_used_at or session.created_at or datetime.utcnow(),
        "created_at": session.created_at or datetime.utcnow(),
        "updated_at": session.updated_at,
        "last_message_preview": preview,
        "message_count": len(messages),
    }


def _load_session_or_404(user_id: str, session_id: str, db: Session) -> StudyChatSession:
    session = (
        db.query(StudyChatSession)
        .options(joinedload(StudyChatSession.messages))
        .filter(
            StudyChatSession.id == session_id,
            StudyChatSession.user_id == user_id,
        )
        .first()
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study chat session not found.",
        )
    return session


def _classify_intent(message: str) -> str:
    text = message.lower()

    if any(keyword in text for keyword in ["pyq", "previous year", "past year", "year-wise"]):
        return "pyq_help"

    if any(
        keyword in text
        for keyword in [
            "roadmap",
            "week",
            "month plan",
            "target date",
            "timeline",
            "milestone",
        ]
    ):
        return "roadmap_help"

    if any(
        keyword in text
        for keyword in [
            "planner",
            "today",
            "task",
            "schedule",
            "carry forward",
            "time block",
            "study block",
        ]
    ):
        return "planner_help"

    if any(
        keyword in text
        for keyword in [
            "weak",
            "struggle",
            "improve",
            "mistake",
            "accuracy",
            "low score",
        ]
    ):
        return "weak_topic_help"

    if any(
        keyword in text
        for keyword in [
            "explain",
            "concept",
            "what is",
            "why",
            "how does",
            "doubt",
        ]
    ):
        return "concept_help"

    return "general_study_help"


def _derive_session_title(message: str, intent: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", message)
    if words:
        title = " ".join(words[:6]).strip().title()
        if title:
            return title[:70]

    fallback_map = {
        "roadmap_help": "Roadmap guidance",
        "planner_help": "Planner support",
        "weak_topic_help": "Weak topic support",
        "concept_help": "Concept doubts",
        "pyq_help": "PYQ practice help",
    }
    return fallback_map.get(intent, "Study chat")


def _load_active_roadmap(user_id: str, db: Session) -> StudyRoadmap | None:
    return (
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


def _select_current_week(roadmap: StudyRoadmap | None) -> RoadmapWeek | None:
    if roadmap is None:
        return None

    today = date.today()
    sorted_weeks = sorted(roadmap.weeks, key=lambda item: _to_int(item.week_number, 0))
    for week in sorted_weeks:
        if isinstance(week.start_date, date) and isinstance(week.end_date, date):
            if week.start_date <= today <= week.end_date:
                return week

    return sorted_weeks[0] if sorted_weeks else None


def _planner_summary(user_id: str, db: Session) -> dict:
    today = date.today()
    plan = (
        db.query(DailyStudyPlan)
        .options(
            joinedload(DailyStudyPlan.tasks).joinedload(DailyStudyTask.topic),
            joinedload(DailyStudyPlan.tasks).joinedload(DailyStudyTask.subject),
            joinedload(DailyStudyPlan.roadmap_week),
        )
        .filter(
            DailyStudyPlan.user_id == user_id,
            DailyStudyPlan.plan_date == today,
        )
        .first()
    )

    if plan is None:
        return {
            "has_plan": False,
            "status": "missing",
            "pending_tasks": [],
            "completed_tasks": 0,
            "total_tasks": 0,
            "completion_pct": 0.0,
            "roadmap_focus_label": None,
        }

    tasks = sorted(plan.tasks or [], key=lambda item: _to_int(item.sequence_order, 0))
    pending_tasks = [
        {
            "task_id": str(task.id),
            "title": _clean_text(task.title),
            "task_type": _clean_text(task.task_type),
            "target_minutes": _to_int(task.target_minutes, 0),
            "topic_name": task.topic.name if task.topic else None,
        }
        for task in tasks
        if _clean_text(task.status) in {"pending", "in_progress"}
    ]
    completed_tasks = [task for task in tasks if _clean_text(task.status) == "completed"]

    completion_pct = 0.0
    if tasks:
        completion_pct = round((len(completed_tasks) / len(tasks)) * 100, 2)

    return {
        "has_plan": True,
        "status": _clean_text(plan.status, "active"),
        "pending_tasks": pending_tasks[:5],
        "completed_tasks": len(completed_tasks),
        "total_tasks": len(tasks),
        "completion_pct": completion_pct,
        "roadmap_focus_label": (
            _clean_text(plan.roadmap_week.focus_label)
            if plan.roadmap_week and plan.roadmap_week.focus_label
            else None
        ),
    }


def _recent_due_revisions(user_id: str, db: Session) -> list[dict]:
    rows = (
        db.query(RevisionSchedule)
        .options(joinedload(RevisionSchedule.topic).joinedload(Topic.subject))
        .filter(
            RevisionSchedule.user_id == user_id,
            RevisionSchedule.is_done.is_(False),
        )
        .order_by(RevisionSchedule.due_date.asc())
        .limit(5)
        .all()
    )

    items: list[dict] = []
    for row in rows:
        topic = row.topic
        items.append(
            {
                "schedule_id": str(row.id),
                "topic_id": str(row.topic_id),
                "topic_name": topic.name if topic else None,
                "subject_name": topic.subject.name if topic and topic.subject else None,
                "due_date": row.due_date.isoformat() if isinstance(row.due_date, datetime) else None,
                "last_score_pct": round(_to_float(row.last_score_pct, 0.0), 2),
            }
        )

    return items


def _recent_attempt_summaries(user_id: str, db: Session) -> list[dict]:
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.started_at.desc())
        .limit(5)
        .all()
    )

    summaries: list[dict] = []
    for attempt in attempts:
        summaries.append(
            {
                "attempt_id": str(attempt.id),
                "quiz_type": _clean_text(attempt.quiz_type),
                "score": round(_to_float(attempt.score, 0.0), 2),
                "total_questions": _to_int(attempt.total_questions, 0),
                "completed_at": (
                    attempt.completed_at.isoformat()
                    if isinstance(attempt.completed_at, datetime)
                    else (
                        attempt.started_at.isoformat()
                        if isinstance(attempt.started_at, datetime)
                        else None
                    )
                ),
            }
        )

    return summaries


def _weak_topic_summaries(user_id: str, db: Session) -> list[dict]:
    rows = (
        db.query(TopicMastery)
        .options(joinedload(TopicMastery.topic).joinedload(Topic.subject))
        .filter(TopicMastery.user_id == user_id)
        .order_by(TopicMastery.weakness_score.desc())
        .limit(5)
        .all()
    )

    topics: list[dict] = []
    for row in rows:
        topic = row.topic
        accuracy = _to_float(row.accuracy, 0.0)
        topics.append(
            {
                "topic_id": str(row.topic_id),
                "topic_name": topic.name if topic else None,
                "subject_name": topic.subject.name if topic and topic.subject else None,
                "weakness_score": round(_to_float(row.weakness_score, 0.0), 2),
                "accuracy_pct": round(accuracy * 100 if accuracy <= 1 else accuracy, 2),
                "mastery_level": _clean_text(getattr(row.mastery_level, "value", row.mastery_level), "Moderate"),
            }
        )

    return topics


def _match_topic_from_query(message: str, weak_topics: list[dict], roadmap_topics: list[str], planner_topics: list[str]) -> str | None:
    tokens = {item.lower() for item in extract_tags(message)}
    tokens.update(re.findall(r"[a-zA-Z0-9_]+", message.lower()))

    candidate_names: list[str] = []
    for weak in weak_topics:
        topic_name = weak.get("topic_name")
        if isinstance(topic_name, str) and topic_name:
            candidate_names.append(topic_name)
    candidate_names.extend(roadmap_topics)
    candidate_names.extend(planner_topics)

    seen: set[str] = set()
    for topic_name in candidate_names:
        normalized = topic_name.strip()
        if not normalized:
            continue
        lower_name = normalized.lower()
        if lower_name in seen:
            continue
        seen.add(lower_name)

        if any(token in lower_name for token in tokens):
            return normalized

    if weak_topics:
        first_name = weak_topics[0].get("topic_name")
        if isinstance(first_name, str) and first_name:
            return first_name

    return None


def _build_recommended_actions(intent: str, snapshot: dict) -> list[str]:
    actions: list[str] = []

    planner = _safe_dict(snapshot.get("planner"))
    roadmap = _safe_dict(snapshot.get("roadmap"))
    weak_topics = snapshot.get("weak_topics") if isinstance(snapshot.get("weak_topics"), list) else []

    pending_tasks = planner.get("pending_tasks")
    if isinstance(pending_tasks, list) and pending_tasks:
        first_task = pending_tasks[0]
        if isinstance(first_task, dict):
            actions.append(f"Complete planner task: {_clean_text(first_task.get('title'), 'Next pending task')}.")

    if weak_topics:
        weak_name = weak_topics[0].get("topic_name") if isinstance(weak_topics[0], dict) else None
        if isinstance(weak_name, str) and weak_name:
            actions.append(f"Take one adaptive quiz block focused on {weak_name}.")

    if not roadmap.get("has_roadmap"):
        actions.append("Generate your roadmap to get week-wise focus guidance.")

    if intent == "pyq_help":
        actions.append("Launch a filtered PYQ practice set for your weak topic.")

    if not actions:
        actions.append("Use the planner for today and then attempt one adaptive quiz block.")

    return actions[:4]


def _build_grounding_snapshot(user_id: str, message: str, intent: str, db: Session) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    weak_topics = _weak_topic_summaries(user_id=user_id, db=db)

    roadmap = _load_active_roadmap(user_id=user_id, db=db)
    current_week = _select_current_week(roadmap)
    roadmap_topics: list[str] = []
    if current_week is not None:
        for topic_item in sorted(current_week.topics, key=lambda item: _to_int(item.sequence_order, 0)):
            if topic_item.topic and topic_item.topic.name:
                roadmap_topics.append(topic_item.topic.name)

    planner = _planner_summary(user_id=user_id, db=db)
    planner_topics: list[str] = []
    pending_tasks = planner.get("pending_tasks")
    if isinstance(pending_tasks, list):
        for task in pending_tasks:
            if not isinstance(task, dict):
                continue
            topic_name = task.get("topic_name")
            if isinstance(topic_name, str) and topic_name:
                planner_topics.append(topic_name)

    matched_topic = _match_topic_from_query(
        message=message,
        weak_topics=weak_topics,
        roadmap_topics=roadmap_topics,
        planner_topics=planner_topics,
    )

    current_week_focus_raw = getattr(current_week, "focus_label", None) if current_week is not None else None
    current_week_focus = _clean_text(current_week_focus_raw)

    snapshot = {
        "generated_at": datetime.utcnow().isoformat(),
        "intent": intent,
        "query_tags": extract_tags(message)[:8],
        "matched_topic": matched_topic,
        "user_profile": {
            "daily_study_minutes": _to_int(user.daily_study_minutes, 60),
            "experience_level": _clean_text(user.experience_level, "beginner"),
            "exam_target_date": (
                user.exam_target_date.isoformat() if isinstance(user.exam_target_date, date) else None
            ),
            "onboarding_completed": bool(user.onboarding_completed_at),
        },
        "weak_topics": weak_topics,
        "roadmap": {
            "has_roadmap": roadmap is not None,
            "current_week_number": _to_int(current_week.week_number, 0) if current_week is not None else None,
            "current_week_focus": current_week_focus or None,
            "current_week_topics": roadmap_topics[:6],
            "total_weeks": _to_int(roadmap.plan_horizon_weeks, 0) if roadmap is not None else 0,
        },
        "planner": planner,
        "revisions_due": _recent_due_revisions(user_id=user_id, db=db),
        "recent_quiz_attempts": _recent_attempt_summaries(user_id=user_id, db=db),
    }

    snapshot["recommended_actions"] = _build_recommended_actions(intent=intent, snapshot=snapshot)
    return snapshot


def _build_fallback_reply(intent: str, grounding_snapshot: dict) -> str:
    profile = _safe_dict(grounding_snapshot.get("user_profile"))
    weak_topics = grounding_snapshot.get("weak_topics") if isinstance(grounding_snapshot.get("weak_topics"), list) else []
    planner = _safe_dict(grounding_snapshot.get("planner"))
    roadmap = _safe_dict(grounding_snapshot.get("roadmap"))

    top_weak = None
    if weak_topics and isinstance(weak_topics[0], dict):
        top_weak = weak_topics[0]

    weak_name = _clean_text(top_weak.get("topic_name") if isinstance(top_weak, dict) else None, "your weakest topic")
    weak_subject = _clean_text(top_weak.get("subject_name") if isinstance(top_weak, dict) else None, "core subject")

    pending_tasks_raw = planner.get("pending_tasks")
    pending_tasks: list[dict[str, Any]] = []
    if isinstance(pending_tasks_raw, list):
        pending_tasks = [task for task in pending_tasks_raw if isinstance(task, dict)]
    pending_count = len(pending_tasks)

    current_week = roadmap.get("current_week_number")
    current_focus = roadmap.get("current_week_focus")

    if intent in {"weak_topic_help", "concept_help"}:
        return (
            f"You are currently weakest in {weak_name} ({weak_subject}). "
            f"Start with a focused 30-minute concept review, then solve 8-10 targeted questions. "
            "After that, check your adaptive quiz result and capture one mistake pattern to revise tomorrow."
        )

    if intent == "roadmap_help":
        week_text = f"week {current_week}" if current_week else "your current roadmap week"
        focus_text = _clean_text(current_focus, "core weak-topic reinforcement")
        return (
            f"Your roadmap focus for {week_text} is {focus_text}. "
            "Prioritize the focus topics first, then use planner practice blocks to reinforce retention. "
            "If a week slips, carry forward only the highest-impact pending task."
        )

    if intent == "planner_help":
        if pending_tasks:
            first_task_title = _clean_text(pending_tasks[0].get("title"), "your first pending task")
            return (
                f"You have {pending_count} pending planner tasks. Start with '{first_task_title}' and finish one full block before switching context. "
                "Then complete one practice task and close with a 10-minute revision recap."
            )
        return (
            "Your planner is currently light. Create or refresh today's plan, complete at least one focused study block, "
            "and then attempt an adaptive quiz to keep momentum."
        )

    if intent == "pyq_help":
        return (
            f"Use the PYQ browser to filter around {weak_name} and solve a short set from recent years. "
            "Review explanation quality, then repeat with one adjacent topic to strengthen transfer."
        )

    daily_minutes = _to_int(profile.get("daily_study_minutes"), 60)
    return (
        f"A strong next step is a {daily_minutes}-minute study session split into concept review, targeted practice, and quick revision. "
        f"Center today's effort on {weak_name}, then validate progress with an adaptive quiz block."
    )


def _build_prompt_history(messages: list[StudyChatMessage], max_messages: int = 10) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for message in messages[-max_messages:]:
        role = _normalize_role(message.role)
        if role not in {"user", "assistant"}:
            continue
        history.append(
            {
                "role": role,
                "message": _clean_text(message.message_text)[:1200],
            }
        )
    return history


def list_chat_sessions(user_id: str, db: Session) -> dict:
    sessions = (
        db.query(StudyChatSession)
        .options(joinedload(StudyChatSession.messages))
        .filter(StudyChatSession.user_id == user_id)
        .order_by(StudyChatSession.last_used_at.desc())
        .limit(30)
        .all()
    )

    return {
        "sessions": [_serialize_session_summary(session) for session in sessions],
    }


def create_chat_session(user_id: str, request: CreateChatSessionRequest, db: Session) -> dict:
    title = _clean_text(request.title, "New Study Chat")
    context_type = _clean_text(request.context_type, "general")

    now = datetime.utcnow()
    session = StudyChatSession(
        user_id=user_id,
        title=title,
        context_type=context_type,
        last_used_at=now,
        metadata_json={
            "created_via": "study_chat_page",
        },
        created_at=now,
        updated_at=now,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session": _serialize_session_summary(session),
        "messages": [],
    }


def get_chat_session(user_id: str, session_id: str, db: Session) -> dict:
    session = _load_session_or_404(user_id=user_id, session_id=session_id, db=db)
    messages = _session_messages_sorted(session)

    return {
        "session": _serialize_session_summary(session),
        "messages": [_serialize_message(message) for message in messages],
    }


async def send_chat_message(user_id: str, session_id: str, message_text: str, db: Session) -> dict:
    session = _load_session_or_404(user_id=user_id, session_id=session_id, db=db)
    existing_user_messages = [item for item in session.messages if _normalize_role(item.role) == "user"]

    user_message = StudyChatMessage(
        session_id=str(session.id),
        role="user",
        message_text=_clean_text(message_text),
        grounding_snapshot_json=None,
        token_usage_json=None,
        created_at=datetime.utcnow(),
    )
    db.add(user_message)
    db.flush()

    intent = _classify_intent(_clean_text(message_text))
    grounding_snapshot = _build_grounding_snapshot(
        user_id=user_id,
        message=_clean_text(message_text),
        intent=intent,
        db=db,
    )
    fallback_reply = _build_fallback_reply(intent=intent, grounding_snapshot=grounding_snapshot)

    prompt_history = _build_prompt_history(
        _session_messages_sorted(session) + [user_message],
        max_messages=10,
    )

    assistant_reply = await generate_study_chat_reply(
        user_message=_clean_text(message_text),
        intent=intent,
        grounding_context=grounding_snapshot,
        conversation_history=prompt_history,
        fallback_response=fallback_reply,
    )
    assistant_source = (
        "fallback"
        if _clean_text(assistant_reply) == _clean_text(fallback_reply)
        else "ai"
    )

    assistant_message = StudyChatMessage(
        session_id=str(session.id),
        role="assistant",
        message_text=_clean_text(assistant_reply, fallback_reply),
        grounding_snapshot_json=grounding_snapshot,
        token_usage_json={"source": assistant_source, "intent": intent},
        created_at=datetime.utcnow(),
    )
    db.add(assistant_message)

    setattr(session, "context_type", INTENT_CONTEXT_MAP.get(intent, "general"))
    setattr(session, "last_used_at", datetime.utcnow())
    setattr(session, "updated_at", datetime.utcnow())

    if not existing_user_messages and _clean_text(session.title, "").lower() in {"", "new study chat", "study chat"}:
        setattr(session, "title", _derive_session_title(_clean_text(message_text), intent))

    db.add(session)
    db.commit()
    db.refresh(session)
    db.refresh(user_message)
    db.refresh(assistant_message)

    return {
        "session": _serialize_session_summary(session),
        "user_message": _serialize_message(user_message),
        "assistant_message": _serialize_message(assistant_message),
    }
