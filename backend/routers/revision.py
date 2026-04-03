from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import RevisionSchedule, User

router = APIRouter()


class MarkDoneRequest(BaseModel):
	topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")

	model_config = {
		"json_schema_extra": {
			"example": {"topic_id": "d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a"}
		}
	}


@router.get("/plan", summary="Get due revision plan")
def revision_plan(
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	schedules = (
		db.query(RevisionSchedule)
		.filter(
			RevisionSchedule.user_id == user.id,
			RevisionSchedule.is_done.is_(False),
			RevisionSchedule.due_date <= datetime.utcnow(),
		)
		.join(RevisionSchedule.topic)
		.all()
	)

	return {
		"revision_items": [
			{
				"topic_id": str(schedule.topic_id),
				"topic_name": schedule.topic.name if schedule.topic else "",
				"subject_name": (
					schedule.topic.subject.name
					if schedule.topic and schedule.topic.subject
					else ""
				),
				"due_date": schedule.due_date.isoformat() if schedule.due_date else None,
				"interval_days": int(schedule.interval_days or 0),
				"last_score_pct": float(schedule.last_score_pct or 0.0),
			}
			for schedule in schedules
		]
	}


@router.post("/mark-done", summary="Mark a revision item as completed")
def mark_done(
	req: MarkDoneRequest,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> dict:
	schedule = (
		db.query(RevisionSchedule)
		.filter(
			RevisionSchedule.user_id == user.id,
			RevisionSchedule.topic_id == req.topic_id,
		)
		.first()
	)

	if schedule:
		schedule.is_done = True
		db.commit()

	return {"success": True}
