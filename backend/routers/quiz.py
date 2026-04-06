from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import User
from schemas.quiz_schemas import (
	CreateMockSessionRequest,
	MockSessionResponse,
	QuizAttemptHistoryResponse,
	QuizAttemptResultResponse,
	QuizQuestionsResponse,
	QuizResultResponse,
	SubmitQuizRequest,
)
from services.quiz_service import (
	create_mock_session,
	get_attempt_history,
	get_attempt_result,
	get_diagnostic_questions,
	get_mock_session,
	process_quiz_submission,
)
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


@router.post(
	"/mock-session",
	response_model=MockSessionResponse,
	summary="Create a validated mock quiz session",
)
def create_validated_mock_session(
	req: CreateMockSessionRequest,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	return create_mock_session(str(user.id), req, db)


@router.get(
	"/mock-session/{session_id}",
	response_model=MockSessionResponse,
	summary="Get a previously created mock quiz session",
)
def fetch_mock_session(
	session_id: str,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	return get_mock_session(str(user.id), session_id, db)


@router.get(
	"/attempts",
	response_model=QuizAttemptHistoryResponse,
	summary="List persisted quiz attempts",
)
def attempt_history(
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
	source: str | None = None,
	limit: int = 20,
) -> dict:
	return get_attempt_history(str(user.id), source, db, limit=limit)


@router.get(
	"/attempts/{attempt_id}",
	response_model=QuizAttemptResultResponse,
	summary="Get a persisted quiz result snapshot",
)
def attempt_result(
	attempt_id: str,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	return get_attempt_result(user.id, attempt_id, db)
