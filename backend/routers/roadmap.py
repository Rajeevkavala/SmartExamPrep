from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import User
from schemas.roadmap_schemas import (
    CompleteRoadmapWeekResponse,
    GenerateRoadmapRequest,
    RoadmapCurrentResponse,
    RoadmapWeekResponse,
    UpdateRoadmapDayRequest,
)
from services.roadmap_service import (
    generate_roadmap,
    get_current_roadmap,
    get_roadmap_week,
    mark_roadmap_week_complete,
    regenerate_roadmap,
    update_roadmap_day_status,
)


router = APIRouter()


@router.post(
    "/generate",
    response_model=RoadmapCurrentResponse,
    summary="Generate or return the active personalized roadmap",
)
def generate(
    request: GenerateRoadmapRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return generate_roadmap(user_id=str(user.id), request=request, db=db)


@router.get(
    "/current",
    response_model=RoadmapCurrentResponse,
    summary="Get the current active roadmap",
)
def current(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return get_current_roadmap(user_id=str(user.id), db=db)


@router.get(
    "/weeks/{week_number}",
    response_model=RoadmapWeekResponse,
    summary="Get a specific week from the current roadmap",
)
def week_detail(
    week_number: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return get_roadmap_week(user_id=str(user.id), week_number=week_number, db=db)


@router.post(
    "/regenerate",
    response_model=RoadmapCurrentResponse,
    summary="Regenerate roadmap and supersede the previous active version",
)
def regenerate(
    request: GenerateRoadmapRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return regenerate_roadmap(user_id=str(user.id), request=request, db=db)


@router.patch(
    "/weeks/{week_number}/days/{day_number}",
    response_model=RoadmapWeekResponse,
    summary="Update day-wise roadmap tracking status",
)
def update_day_status(
    week_number: Annotated[int, Path(ge=1)],
    day_number: Annotated[int, Path(ge=1, le=7)],
    request: UpdateRoadmapDayRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return update_roadmap_day_status(
        user_id=str(user.id),
        week_number=week_number,
        day_number=day_number,
        status_value=request.status,
        db=db,
    )


@router.post(
    "/weeks/{week_number}/complete",
    response_model=CompleteRoadmapWeekResponse,
    summary="Mark all days in a week complete in one transactional operation",
)
def complete_week(
    week_number: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return mark_roadmap_week_complete(
        user_id=str(user.id),
        week_number=week_number,
        db=db,
    )
