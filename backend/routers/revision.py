from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import DailyStudyTask, RevisionSchedule, User
from services.study_activity_service import create_activity_log

router = APIRouter()


class MarkDoneRequest(BaseModel):
	topic_id: str | None = Field(default=None, example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")
	schedule_id: str | None = Field(default=None, example="f4a2152e-7ab6-4f66-9f5d-3e4de8b95a2a")
	daily_task_id: str | None = Field(default=None, example="4e9bb77d-5b8d-4e6d-b8b5-20e14be6d004")

	model_config = {
		"json_schema_extra": {
			"example": {
				"topic_id": "d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a",
				"daily_task_id": "4e9bb77d-5b8d-4e6d-b8b5-20e14be6d004",
			}
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
				"schedule_id": str(schedule.id),
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
	if not req.topic_id and not req.schedule_id:
		return {
			"success": False,
			"detail": "Provide topic_id or schedule_id to mark revision as done.",
		}

	schedule_query = db.query(RevisionSchedule).filter(RevisionSchedule.user_id == user.id)
	if req.schedule_id:
		schedule_query = schedule_query.filter(RevisionSchedule.id == req.schedule_id)
	elif req.topic_id:
		schedule_query = schedule_query.filter(RevisionSchedule.topic_id == req.topic_id)

	schedule = schedule_query.first()
	task_completed = False

	if schedule:
		if not schedule.is_done:
			schedule.is_done = True
			db.add(schedule)

			create_activity_log(
				user_id=str(user.id),
				activity_type="revision_done",
				db=db,
				related_entity_type="revision_schedule",
				related_entity_id=str(schedule.id),
				duration_minutes=20,
				questions_solved=0,
				payload={
					"topic_id": str(schedule.topic_id),
					"interval_days": int(schedule.interval_days or 0),
					"last_score_pct": float(schedule.last_score_pct or 0.0),
				},
				topic_id=str(schedule.topic_id),
			)

	if req.daily_task_id:
		task = (
			db.query(DailyStudyTask)
			.filter(DailyStudyTask.id == req.daily_task_id)
			.first()
		)
		if task and task.daily_plan and str(task.daily_plan.user_id) == str(user.id):
			task_completed = True
			if task.status != "completed":
				task.status = "completed"
				task.completed_at = datetime.utcnow()
				db.add(task)
				plan = task.daily_plan
				tasks = list(plan.tasks or [])
				plan.total_planned_minutes = sum(int(item.target_minutes or 0) for item in tasks)
				plan.total_completed_minutes = sum(
					int(item.target_minutes or 0) for item in tasks if item.status == "completed"
				)
				plan.status = (
					"completed"
					if tasks and all(item.status in {"completed", "skipped"} for item in tasks)
					else "active"
				)
				db.add(plan)

	db.commit()

	return {"success": bool(schedule) or task_completed}
