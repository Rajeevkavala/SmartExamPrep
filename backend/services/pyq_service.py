from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Query, Session, joinedload

from models.models import DifficultyEnum, Question, SourceTypeEnum, Subject, Topic
from schemas.pyq_schemas import StartPYQPracticeRequest


def _enum_value(value: object) -> str:
    if value is None:
        return ""
    return str(getattr(value, "value", value))


def _safe_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]


def _normalize_difficulty(value: str | None) -> DifficultyEnum | None:
    if value is None:
        return None

    normalized = value.strip().lower()
    if not normalized:
        return None

    for difficulty in DifficultyEnum:
        if difficulty.value.lower() == normalized:
            return difficulty

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid difficulty. Allowed values: easy, medium, hard.",
    )


def _sanitize_search(value: str | None) -> str | None:
    if value is None:
        return None
    search = value.strip()
    return search if search else None


def _normalize_uuid(value: str | None, field_name: str) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    if not normalized:
        return None

    try:
        UUID(normalized)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}. Must be a valid UUID.",
        ) from exc

    return normalized


def _base_pyq_query(db: Session) -> Query:
    return (
        db.query(Question)
        .options(joinedload(Question.subject), joinedload(Question.topic))
        .filter(
            Question.source_type == SourceTypeEnum.PYQ,
            Question.is_verified.is_(True),
        )
    )


def _apply_filters(
    query: Query,
    *,
    subject_id: str | None,
    topic_id: str | None,
    difficulty: DifficultyEnum | None,
    year_from: int | None,
    year_to: int | None,
    search: str | None,
) -> Query:
    if subject_id:
        query = query.filter(Question.subject_id == str(subject_id))

    if topic_id:
        query = query.filter(Question.topic_id == str(topic_id))

    if difficulty is not None:
        query = query.filter(Question.difficulty == difficulty)

    if year_from is not None:
        query = query.filter(Question.year.isnot(None), Question.year >= int(year_from))

    if year_to is not None:
        query = query.filter(Question.year.isnot(None), Question.year <= int(year_to))

    if search:
        query = query.filter(Question.question_text.ilike(f"%{search}%"))

    return query


def _build_applied_filters(
    *,
    subject_id: str | None,
    topic_id: str | None,
    difficulty: str | None,
    year_from: int | None,
    year_to: int | None,
    search: str | None,
) -> dict:
    filters: dict[str, object] = {}

    if subject_id:
        filters["subject_id"] = str(subject_id)
    if topic_id:
        filters["topic_id"] = str(topic_id)
    if difficulty:
        filters["difficulty"] = difficulty
    if year_from is not None:
        filters["year_from"] = int(year_from)
    if year_to is not None:
        filters["year_to"] = int(year_to)
    if search:
        filters["search"] = search

    return filters


def _resolve_named_filters(db: Session, applied_filters: dict) -> dict:
    context_filters = dict(applied_filters)

    subject_id = context_filters.get("subject_id")
    if isinstance(subject_id, str):
        subject = db.query(Subject.id, Subject.name).filter(Subject.id == subject_id).first()
        if subject is not None:
            context_filters["subject_name"] = str(subject.name)

    topic_id = context_filters.get("topic_id")
    if isinstance(topic_id, str):
        topic = db.query(Topic.id, Topic.name).filter(Topic.id == topic_id).first()
        if topic is not None:
            context_filters["topic_name"] = str(topic.name)

    return context_filters


def _question_to_browse_item(question: Question) -> dict:
    return {
        "id": str(question.id),
        "subject_id": str(question.subject_id),
        "subject_name": question.subject.name if question.subject else "",
        "topic_id": str(question.topic_id),
        "topic_name": question.topic.name if question.topic else "",
        "subtopic": question.subtopic,
        "difficulty": _enum_value(question.difficulty),
        "year": question.year,
        "source_url": question.source_url,
        "question_text": question.question_text,
        "options": _safe_list(question.options),
        "question_image_urls": _safe_list(question.question_image_urls),
        "correct_answer": str(question.correct_answer or "").strip() or None,
        "explanation": str(question.explanation or "").strip() or None,
        "marks": 1,
    }


def _question_to_quiz_payload(question: Question) -> dict:
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


def get_pyq_filter_options(db: Session) -> dict:
    base_filter = [
        Question.source_type == SourceTypeEnum.PYQ,
        Question.is_verified.is_(True),
    ]

    years = [
        int(year)
        for (year,) in (
            db.query(Question.year)
            .filter(*base_filter, Question.year.isnot(None))
            .distinct()
            .order_by(Question.year.desc())
            .all()
        )
        if year is not None
    ]

    subjects = [
        {"id": str(subject_id), "name": str(name)}
        for subject_id, name in (
            db.query(Subject.id, Subject.name)
            .join(Question, Question.subject_id == Subject.id)
            .filter(*base_filter)
            .distinct()
            .order_by(Subject.name.asc())
            .all()
        )
    ]

    topics = [
        {"id": str(topic_id), "subject_id": str(subject_id), "name": str(name)}
        for topic_id, subject_id, name in (
            db.query(Topic.id, Topic.subject_id, Topic.name)
            .join(Question, Question.topic_id == Topic.id)
            .filter(*base_filter)
            .distinct()
            .order_by(Topic.name.asc())
            .all()
        )
    ]

    present_difficulties = {
        _enum_value(difficulty).lower()
        for (difficulty,) in (
            db.query(Question.difficulty)
            .filter(*base_filter)
            .distinct()
            .all()
        )
    }
    difficulties = [
        difficulty
        for difficulty in ["easy", "medium", "hard"]
        if difficulty in present_difficulties
    ]

    return {
        "years": years,
        "subjects": subjects,
        "topics": topics,
        "difficulties": difficulties,
    }


def browse_pyq_questions(
    *,
    db: Session,
    subject_id: str | None,
    topic_id: str | None,
    difficulty: str | None,
    year_from: int | None,
    year_to: int | None,
    search: str | None,
    limit: int,
    offset: int,
) -> dict:
    if year_from is not None and year_to is not None and year_from > year_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="year_from cannot be greater than year_to.",
        )

    normalized_subject_id = _normalize_uuid(subject_id, "subject_id")
    normalized_topic_id = _normalize_uuid(topic_id, "topic_id")
    difficulty_enum = _normalize_difficulty(difficulty)
    search_term = _sanitize_search(search)

    query = _base_pyq_query(db)
    query = _apply_filters(
        query,
        subject_id=normalized_subject_id,
        topic_id=normalized_topic_id,
        difficulty=difficulty_enum,
        year_from=year_from,
        year_to=year_to,
        search=search_term,
    )

    total = query.count()
    questions = (
        query.order_by(Question.year.desc(), Question.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    applied_filters = _build_applied_filters(
        subject_id=normalized_subject_id,
        topic_id=normalized_topic_id,
        difficulty=difficulty_enum.value if difficulty_enum else None,
        year_from=year_from,
        year_to=year_to,
        search=search_term,
    )

    return {
        "total": int(total),
        "limit": int(limit),
        "offset": int(offset),
        "questions": [_question_to_browse_item(question) for question in questions],
        "applied_filters": applied_filters,
        "pagination": {
            "page": int(offset // limit) + 1,
            "page_size": int(limit),
            "has_more": int(offset + len(questions)) < int(total),
        },
    }


def start_pyq_practice_session(req: StartPYQPracticeRequest, db: Session) -> dict:
    if req.year_from is not None and req.year_to is not None and req.year_from > req.year_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="year_from cannot be greater than year_to.",
        )

    normalized_subject_id = _normalize_uuid(req.subject_id, "subject_id")
    normalized_topic_id = _normalize_uuid(req.topic_id, "topic_id")
    difficulty_enum = _normalize_difficulty(req.difficulty)
    search_term = _sanitize_search(req.search)

    query = _base_pyq_query(db)
    query = _apply_filters(
        query,
        subject_id=normalized_subject_id,
        topic_id=normalized_topic_id,
        difficulty=difficulty_enum,
        year_from=req.year_from,
        year_to=req.year_to,
        search=search_term,
    )

    questions = (
        query.order_by(Question.year.desc(), Question.updated_at.desc())
        .limit(req.question_limit)
        .all()
    )
    total_available = query.count()

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verified PYQ questions match the selected filters.",
        )

    applied_filters = _build_applied_filters(
        subject_id=normalized_subject_id,
        topic_id=normalized_topic_id,
        difficulty=difficulty_enum.value if difficulty_enum else None,
        year_from=req.year_from,
        year_to=req.year_to,
        search=search_term,
    )

    context_payload = {
        "source": "pyq_browser",
        "filters": _resolve_named_filters(db, applied_filters),
    }

    return {
        "total": len(questions),
        "requested_count": int(req.question_limit),
        "questions": [_question_to_quiz_payload(question) for question in questions],
        "context_payload": context_payload,
        "selection_summary": {
            "total_available": int(total_available),
            "practice_mode": "verified_pyq_practice",
            "applied_filters": applied_filters,
        },
    }
