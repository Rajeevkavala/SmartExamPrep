from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from dependencies import get_db, require_admin
from models.models import (
	Question,
	RevisionSchedule,
	RoadmapWeekTopic,
	Subject,
	Topic,
	TopicMastery,
	User,
	UserSubjectConfidence,
	UserTopicBaseline,
)
from schemas.admin_schemas import SubjectCreate, SubjectUpdate, TopicCreate, TopicUpdate

router = APIRouter()


def _require_uuid(value: str, field_name: str) -> str:
	try:
		UUID(str(value))
	except (TypeError, ValueError) as exc:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"Invalid {field_name}. Must be a valid UUID.",
		) from exc
	return str(value)


def _subject_to_dict(subject: Subject, topic_count: int = 0) -> dict:
	return {
		"id": str(subject.id),
		"name": subject.name,
		"description": subject.description,
		"display_order": int(subject.display_order or 0),
		"topic_count": int(topic_count),
	}


def _topic_to_dict(topic: Topic) -> dict:
	return {
		"id": str(topic.id),
		"subject_id": str(topic.subject_id),
		"name": topic.name,
		"subtopics": list(topic.subtopics or []),
		"nlp_keyword_tags": list(topic.nlp_keyword_tags or []),
		"display_order": int(topic.display_order or 0),
		"difficulty_weight": float(topic.difficulty_weight or 1.0),
	}


def _get_subject_or_404(db: Session, subject_id: str) -> Subject:
	subject_id = _require_uuid(subject_id, "subject_id")
	subject = db.query(Subject).filter(Subject.id == subject_id).first()
	if subject is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Subject not found.",
		)
	return subject


def _get_topic_or_404(db: Session, topic_id: str) -> Topic:
	topic_id = _require_uuid(topic_id, "topic_id")
	topic = db.query(Topic).filter(Topic.id == topic_id).first()
	if topic is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Topic not found.",
		)
	return topic


@router.get("/subjects", summary="List all subjects with topic counts")
def list_subjects(
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> list[dict]:
	_ = admin
	subjects = db.query(Subject).order_by(Subject.display_order.asc(), Subject.name.asc()).all()
	counts = {
		str(subject_id): count
		for subject_id, count in db.query(Topic.subject_id, func.count(Topic.id)).group_by(Topic.subject_id).all()
	}

	return [_subject_to_dict(subject, topic_count=counts.get(str(subject.id), 0)) for subject in subjects]


@router.post(
	"/subjects",
	status_code=status.HTTP_201_CREATED,
	summary="Create a subject",
)
def create_subject(
	req: SubjectCreate,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	payload = req.model_dump()
	payload["name"] = payload["name"].strip()

	if not payload["name"]:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Subject name is required.",
		)

	existing = (
		db.query(Subject)
		.filter(func.lower(Subject.name) == payload["name"].lower())
		.first()
	)
	if existing:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Subject already exists.",
		)

	subject = Subject(**payload)
	db.add(subject)
	db.commit()
	db.refresh(subject)

	return _subject_to_dict(subject, topic_count=0)


@router.put("/subjects/{subject_id}", summary="Update a subject")
def update_subject(
	subject_id: str,
	req: SubjectUpdate,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	subject = _get_subject_or_404(db, subject_id)
	updates = req.model_dump(exclude_unset=True)

	if "name" in updates:
		updates["name"] = (updates["name"] or "").strip()
		if not updates["name"]:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Subject name cannot be empty.",
			)

		existing = (
			db.query(Subject)
			.filter(
				func.lower(Subject.name) == updates["name"].lower(),
				Subject.id != subject_id,
			)
			.first()
		)
		if existing:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Subject with this name already exists.",
			)

	for key, value in updates.items():
		setattr(subject, key, value)

	db.commit()
	db.refresh(subject)

	topic_count = db.query(Topic).filter(Topic.subject_id == subject.id).count()
	return _subject_to_dict(subject, topic_count=topic_count)


@router.delete("/subjects/{subject_id}", summary="Delete a subject and related topics/questions")
def delete_subject(
	subject_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	subject = _get_subject_or_404(db, subject_id)
	topic_ids = [
		topic_id
		for topic_id, in db.query(Topic.id).filter(Topic.subject_id == subject.id).all()
	]

	# Remove dependent questions first so subject/topic deletion remains FK-safe.
	questions_deleted = (
		db.query(Question)
		.filter(Question.subject_id == subject.id)
		.delete(synchronize_session=False)
	)

	# Remove topic-linked rows first to avoid ORM trying to null out non-null FKs.
	if topic_ids:
		db.query(RevisionSchedule).filter(
			RevisionSchedule.topic_id.in_(topic_ids)
		).delete(synchronize_session=False)
		db.query(TopicMastery).filter(
			TopicMastery.topic_id.in_(topic_ids)
		).delete(synchronize_session=False)
		db.query(UserTopicBaseline).filter(
			UserTopicBaseline.topic_id.in_(topic_ids)
		).delete(synchronize_session=False)
		db.query(RoadmapWeekTopic).filter(
			RoadmapWeekTopic.topic_id.in_(topic_ids)
		).delete(synchronize_session=False)

	# Remove profile and roadmap rows keyed by subject_id before deleting the subject.
	db.query(UserSubjectConfidence).filter(
		UserSubjectConfidence.subject_id == subject.id
	).delete(synchronize_session=False)
	db.query(RoadmapWeekTopic).filter(
		RoadmapWeekTopic.subject_id == subject.id
	).delete(synchronize_session=False)

	db.delete(subject)
	db.commit()

	return {
		"deleted": True,
		"subject_id": subject_id,
		"questions_deleted": int(questions_deleted),
	}


@router.get("/subjects/{subject_id}/topics", summary="List topics for a subject")
def list_topics_for_subject(
	subject_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> list[dict]:
	_ = admin
	_get_subject_or_404(db, subject_id)

	topics = (
		db.query(Topic)
		.filter(Topic.subject_id == subject_id)
		.order_by(Topic.display_order.asc(), Topic.name.asc())
		.all()
	)
	return [_topic_to_dict(topic) for topic in topics]


@router.post(
	"/subjects/{subject_id}/topics",
	status_code=status.HTTP_201_CREATED,
	summary="Create a topic under a subject",
)
def create_topic(
	subject_id: str,
	req: TopicCreate,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	_get_subject_or_404(db, subject_id)
	payload = req.model_dump()
	payload["name"] = payload["name"].strip()

	if not payload["name"]:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Topic name is required.",
		)

	existing = (
		db.query(Topic)
		.filter(
			Topic.subject_id == subject_id,
			func.lower(Topic.name) == payload["name"].lower(),
		)
		.first()
	)
	if existing:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Topic already exists for this subject.",
		)

	topic = Topic(subject_id=subject_id, **payload)
	db.add(topic)
	db.commit()
	db.refresh(topic)

	return _topic_to_dict(topic)


@router.put("/topics/{topic_id}", summary="Update a topic")
def update_topic(
	topic_id: str,
	req: TopicUpdate,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	topic = _get_topic_or_404(db, topic_id)
	updates = req.model_dump(exclude_unset=True)

	if "name" in updates:
		updates["name"] = (updates["name"] or "").strip()
		if not updates["name"]:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Topic name cannot be empty.",
			)

		existing = (
			db.query(Topic)
			.filter(
				Topic.subject_id == topic.subject_id,
				func.lower(Topic.name) == updates["name"].lower(),
				Topic.id != topic_id,
			)
			.first()
		)
		if existing:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Topic with this name already exists for this subject.",
			)

	for key, value in updates.items():
		setattr(topic, key, value)

	db.commit()
	db.refresh(topic)

	return _topic_to_dict(topic)


@router.delete("/topics/{topic_id}", summary="Delete a topic and related questions")
def delete_topic(
	topic_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	topic = _get_topic_or_404(db, topic_id)

	questions_deleted = (
		db.query(Question)
		.filter(Question.topic_id == topic.id)
		.delete(synchronize_session=False)
	)

	db.delete(topic)
	db.commit()

	return {
		"deleted": True,
		"topic_id": topic_id,
		"questions_deleted": int(questions_deleted),
	}
