from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import User
from schemas.pyq_schemas import (
    PYQBrowseResponse,
    PYQFilterOptionsResponse,
    PYQPracticeResponse,
    StartPYQPracticeRequest,
)
from services.pyq_service import (
    browse_pyq_questions,
    get_pyq_filter_options,
    start_pyq_practice_session,
)

router = APIRouter()


@router.get(
    "/filters",
    response_model=PYQFilterOptionsResponse,
    summary="Get verified PYQ filter options",
)
def pyq_filters(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    _ = user
    return get_pyq_filter_options(db)


@router.get(
    "/questions",
    response_model=PYQBrowseResponse,
    summary="Browse verified PYQ questions",
)
def pyq_questions(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
    subject_id: str | None = Query(default=None),
    topic_id: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    year_from: int | None = Query(default=None, ge=1991, le=2100),
    year_to: int | None = Query(default=None, ge=1991, le=2100),
    search: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict:
    _ = user
    return browse_pyq_questions(
        db=db,
        subject_id=subject_id,
        topic_id=topic_id,
        difficulty=difficulty,
        year_from=year_from,
        year_to=year_to,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/practice",
    response_model=PYQPracticeResponse,
    summary="Start a PYQ practice set from filtered verified questions",
)
def pyq_practice(
    req: StartPYQPracticeRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    _ = user
    return start_pyq_practice_session(req, db)
