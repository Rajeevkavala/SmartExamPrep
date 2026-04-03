from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import User
from schemas.analysis_schemas import DashboardResponse, TopicWeaknessItem
from services.dashboard_service import get_dashboard_data
from services.weakness_service import get_weakness_analysis

router = APIRouter()


@router.get(
	"/weakness",
	response_model=list[TopicWeaknessItem],
	summary="Get topic-wise weakness analysis",
)
def weakness(
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> list[dict]:
	return get_weakness_analysis(user.id, db)


@router.get(
	"/dashboard",
	response_model=DashboardResponse,
	summary="Get dashboard analytics snapshot",
)
def dashboard(
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	return get_dashboard_data(user.id, db)
