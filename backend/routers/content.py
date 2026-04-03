from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import Subject, Topic, User

router = APIRouter()


@router.get("/subjects", summary="List all subjects")
def list_subjects(
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> list[dict]:
	_ = user
	subjects = db.query(Subject).order_by(Subject.display_order.asc(), Subject.name.asc()).all()
	return [
		{
			"id": str(subject.id),
			"name": subject.name,
			"description": subject.description,
			"topic_count": len(subject.topics or []),
		}
		for subject in subjects
	]


@router.get("/subjects/{subject_id}/topics", summary="List topics under a subject")
def list_topics(
	subject_id: str,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(require_student)],
) -> list[dict]:
	_ = user
	subject = db.query(Subject).filter(Subject.id == subject_id).first()
	if subject is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Subject not found.",
		)

	topics = (
		db.query(Topic)
		.filter(Topic.subject_id == subject_id)
		.order_by(Topic.display_order.asc(), Topic.name.asc())
		.all()
	)

	return [
		{
			"id": str(topic.id),
			"subject_id": str(topic.subject_id),
			"name": topic.name,
			"subtopics": list(topic.subtopics or []),
			"difficulty_weight": float(topic.difficulty_weight or 1.0),
		}
		for topic in topics
	]
