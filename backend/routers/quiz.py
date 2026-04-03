from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import User
from schemas.quiz_schemas import QuizQuestionsResponse, QuizResultResponse, SubmitQuizRequest
from services.quiz_service import get_diagnostic_questions, process_quiz_submission
from services.recommendation_service import get_adaptive_questions

router = APIRouter()


@router.get(
	"/diagnostic",
	response_model=QuizQuestionsResponse,
	summary="Get diagnostic quiz questions",
)
def diagnostic_quiz(
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	_ = user
	questions = get_diagnostic_questions(db)
	return {"questions": questions, "total": len(questions)}


@router.post(
	"/submit",
	response_model=QuizResultResponse,
	summary="Submit quiz answers and compute analysis",
)
async def submit_quiz(
	req: SubmitQuizRequest,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> QuizResultResponse:
	return await process_quiz_submission(user.id, req, db)


@router.get(
	"/adaptive",
	response_model=QuizQuestionsResponse,
	summary="Get AI-adaptive quiz questions",
)
def adaptive_quiz(
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	questions = get_adaptive_questions(user, db)
	return {"questions": questions, "total": len(questions)}
