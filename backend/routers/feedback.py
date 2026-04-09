from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from dependencies import get_db, require_admin, require_student
from models.models import User, UserFeedback
from schemas.feedback_schemas import FeedbackCreateRequest, FeedbackResponse, FeedbackSummaryResponse

router = APIRouter()


def _serialize_feedback(entry: UserFeedback) -> dict:
	return {
		"feedback_id": str(entry.id),
		"weakness_analysis_rating": int(entry.weakness_analysis_rating or 0),
		"recommendation_rating": int(entry.recommendation_rating or 0),
		"revision_rating": int(entry.revision_rating or 0),
		"ui_clarity_rating": int(entry.ui_clarity_rating or 0),
		"overall_rating": int(entry.overall_rating or 0),
		"comment": entry.comment,
		"context_page": entry.context_page,
		"created_at": entry.created_at.isoformat() if entry.created_at else "",
	}


@router.post(
	"/",
	response_model=FeedbackResponse,
	status_code=status.HTTP_201_CREATED,
	summary="Submit student product feedback",
)
def submit_feedback(
	req: FeedbackCreateRequest,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	entry = UserFeedback(
		user_id=user.id,
		weakness_analysis_rating=req.weakness_analysis_rating,
		recommendation_rating=req.recommendation_rating,
		revision_rating=req.revision_rating,
		ui_clarity_rating=req.ui_clarity_rating,
		overall_rating=req.overall_rating,
		comment=(req.comment or "").strip() or None,
		context_page=(req.context_page or "").strip() or None,
	)
	db.add(entry)
	db.commit()
	db.refresh(entry)
	return _serialize_feedback(entry)


@router.get(
	"/me",
	response_model=list[FeedbackResponse],
	summary="List current student's submitted feedback",
)
def my_feedback(
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
	limit: int = Query(default=20, ge=1, le=100),
) -> list[dict]:
	entries = (
		db.query(UserFeedback)
		.filter(UserFeedback.user_id == user.id)
		.order_by(UserFeedback.created_at.desc())
		.limit(limit)
		.all()
	)
	return [_serialize_feedback(entry) for entry in entries]


@router.get(
	"/admin/recent",
	response_model=list[FeedbackResponse],
	summary="List recent feedback submissions for admin review",
)
def recent_feedback(
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
	limit: int = Query(default=50, ge=1, le=200),
) -> list[dict]:
	_ = admin
	entries = (
		db.query(UserFeedback)
		.order_by(UserFeedback.created_at.desc())
		.limit(limit)
		.all()
	)
	return [_serialize_feedback(entry) for entry in entries]


@router.get(
	"/admin/summary",
	response_model=FeedbackSummaryResponse,
	summary="Aggregate recent feedback signals for admin review",
)
def feedback_summary(
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	total_responses = db.query(func.count(UserFeedback.id)).scalar() or 0
	averages = (
		db.query(
			func.avg(UserFeedback.overall_rating),
			func.avg(UserFeedback.weakness_analysis_rating),
			func.avg(UserFeedback.recommendation_rating),
			func.avg(UserFeedback.revision_rating),
			func.avg(UserFeedback.ui_clarity_rating),
		)
		.first()
	)

	context_rows = (
		db.query(UserFeedback.context_page, func.count(UserFeedback.id))
		.group_by(UserFeedback.context_page)
		.order_by(func.count(UserFeedback.id).desc())
		.limit(5)
		.all()
	)

	return {
		"total_responses": int(total_responses),
		"average_overall_rating": round(float(averages[0] or 0.0), 2) if averages else 0.0,
		"average_weakness_analysis_rating": round(float(averages[1] or 0.0), 2) if averages else 0.0,
		"average_recommendation_rating": round(float(averages[2] or 0.0), 2) if averages else 0.0,
		"average_revision_rating": round(float(averages[3] or 0.0), 2) if averages else 0.0,
		"average_ui_clarity_rating": round(float(averages[4] or 0.0), 2) if averages else 0.0,
		"recent_contexts": [
			{
				"context_page": str(context_page or "unknown"),
				"count": int(count or 0),
			}
			for context_page, count in context_rows
		],
	}
