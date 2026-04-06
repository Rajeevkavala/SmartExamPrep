from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import User
from schemas.exam_schemas import ExamCatalogItem
from services.exam_service import list_exam_catalog


router = APIRouter()


@router.get(
    "/",
    response_model=list[ExamCatalogItem],
    summary="List supported exams for the student workspace",
)
def exams(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> list[dict]:
    _ = user
    return list_exam_catalog(db)
