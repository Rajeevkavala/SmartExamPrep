from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from config import settings
from dependencies import get_db, require_student
from models.models import QuizAttempt, Topic, TopicMastery, User
from schemas.ai_schemas import (
	CopyPredictionToRoadmapRequest,
	CopyPredictionToRoadmapResponse,
	ExplainRequest,
	PredictionSnapshotResponse,
	RefreshPredictionRequest,
)
from services.ai_service import (
	generate_weakness_explanation,
	provider_readiness,
)
from services.prediction_service import (
	copy_predictions_to_roadmap,
	get_prediction_snapshot,
	refresh_prediction_snapshot,
)

router = APIRouter()


@router.get("/status", summary="Get AI provider availability")
def ai_status(user: Annotated[User, Depends(require_student)]) -> dict:
	_ = user
	return provider_readiness()


def _count_repeated_mistakes(user_id: str, topic_id: str, db: Session) -> int:
	"""Count questions in this topic that were answered wrong 2+ times."""
	attempts = (
		db.query(QuizAttempt)
		.filter(QuizAttempt.user_id == user_id)
		.order_by(QuizAttempt.started_at.desc())
		.limit(10)
		.all()
	)

	mistake_counts: dict[str, int] = {}
	for attempt in attempts:
		answers = attempt.answers or []
		if not isinstance(answers, list):
			continue
		for answer in answers:
			if not isinstance(answer, dict):
				continue
			if str(answer.get("topic_id")) != str(topic_id):
				continue
			if not answer.get("correct", False):
				question_id = answer.get("question_id")
				if question_id:
					qid = str(question_id)
					mistake_counts[qid] = mistake_counts.get(qid, 0) + 1

	return sum(1 for count in mistake_counts.values() if count >= 2)


@router.post("/explain", summary="Generate AI explanation for a weak topic")
async def explain(
	req: ExplainRequest,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	mastery = (
		db.query(TopicMastery)
		.filter(
			TopicMastery.user_id == user.id,
			TopicMastery.topic_id == req.topic_id,
		)
		.first()
	)
	topic = db.query(Topic).filter(Topic.id == req.topic_id).first()

	if not mastery or not topic:
		return {
			"topic_name": topic.name if topic else None,
			"explanation": "No data available for this topic yet.",
		}

	repeated_mistakes = _count_repeated_mistakes(str(user.id), str(topic.id), db)

	explanation = await generate_weakness_explanation(
		topic_name=topic.name,
		subject_name=topic.subject.name if topic.subject else "",
		weakness_score=float(mastery.weakness_score or 0.0),
		accuracy=float(mastery.accuracy or 0.0),
		repeated_mistakes=repeated_mistakes,
		avg_response_time_s=float(mastery.avg_response_time_s or 0.0),
		user_id=str(user.id),
		topic_id=str(topic.id),
	)

	return {
		"topic_name": topic.name,
		"explanation": explanation,
	}


@router.get(
	"/predictions",
	response_model=PredictionSnapshotResponse,
	summary="Get the latest topic prediction snapshot for an exam",
)
def predictions(
	exam_id: str = Query(...),
	db: Session = Depends(get_db),
	user: User = Depends(require_student),
) -> dict:
	_ = user
	return get_prediction_snapshot(db, exam_id)


@router.post(
	"/predictions/refresh",
	response_model=PredictionSnapshotResponse,
	summary="Refresh topic predictions for an exam",
)
def refresh_predictions(
	req: RefreshPredictionRequest,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	return refresh_prediction_snapshot(db, req.exam_id, str(user.id))


@router.post(
	"/predictions/{exam_id}/copy-to-roadmap",
	response_model=CopyPredictionToRoadmapResponse,
	summary="Copy predicted topics into a roadmap generation request",
)
def copy_to_roadmap(
	exam_id: str,
	req: CopyPredictionToRoadmapRequest,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	return copy_predictions_to_roadmap(
		db=db,
		user=user,
		exam_id=exam_id,
		topic_ids=req.topic_ids,
		force_regenerate=req.force_regenerate,
	)
