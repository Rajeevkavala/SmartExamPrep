from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import Topic, TopicMastery, User
from services.gemini_service import generate_weakness_explanation

router = APIRouter()


class ExplainRequest(BaseModel):
	topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")

	model_config = {
		"json_schema_extra": {
			"example": {"topic_id": "d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a"}
		}
	}


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

	explanation = await generate_weakness_explanation(
		topic_name=topic.name,
		subject_name=topic.subject.name if topic.subject else "",
		weakness_score=float(mastery.weakness_score or 0.0),
		accuracy=float(mastery.accuracy or 0.0),
		repeated_mistakes=0,
		avg_response_time_s=float(mastery.avg_response_time_s or 0.0),
		user_id=str(user.id),
		topic_id=str(topic.id),
	)

	return {
		"topic_name": topic.name,
		"explanation": explanation,
	}
