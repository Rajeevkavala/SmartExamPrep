from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.models import Subject, Topic, User, UserSubjectConfidence, UserTopicBaseline
from schemas.auth_schemas import SubjectConfidenceItem, UpdateProfileRequest, UserResponse


def _serialize_subject_confidences(
	items: list[UserSubjectConfidence],
) -> list[SubjectConfidenceItem]:
	return [
		SubjectConfidenceItem(
			subject_id=str(item.subject_id),
			confidence_pct=int(item.confidence_pct),
		)
		for item in sorted(items, key=lambda entry: str(entry.subject_id))
	]


def serialize_user_profile(user: User) -> UserResponse:
	role_value = getattr(user.role, "value", user.role)
	known_topic_ids = sorted(
		str(item.topic_id)
		for item in user.topic_baselines
		if item.already_known
	)

	return UserResponse(
		id=str(user.id),
		email=user.email,
		full_name=user.full_name,
		phone=user.phone,
		language=user.language,
		timezone=user.timezone,
		role=role_value,
		daily_study_minutes=user.daily_study_minutes,
		experience_level=user.experience_level,
		email_notifications_enabled=bool(user.email_notifications_enabled),
		push_notifications_enabled=bool(user.push_notifications_enabled),
		study_reminders_enabled=bool(user.study_reminders_enabled),
		exam_target_date=user.exam_target_date,
		onboarding_version=user.onboarding_version,
		onboarding_completed_at=user.onboarding_completed_at,
		created_at=user.created_at,
		updated_at=user.updated_at,
		subject_confidences=_serialize_subject_confidences(user.subject_confidences),
		known_topic_ids=known_topic_ids,
	)


def _ensure_unique_ids(values: list[str], label: str) -> None:
	duplicates = {value for value in values if values.count(value) > 1}
	if duplicates:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"Duplicate {label} ids are not allowed.",
		)


def _validate_subject_confidences(
	db: Session,
	subject_confidences: list[SubjectConfidenceItem],
) -> None:
	subject_ids = [item.subject_id for item in subject_confidences]
	_ensure_unique_ids(subject_ids, "subject")

	if not subject_ids:
		return

	existing_ids = {
		row[0]
		for row in db.query(Subject.id).filter(Subject.id.in_(subject_ids)).all()
	}
	missing_ids = sorted(set(subject_ids) - existing_ids)
	if missing_ids:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="One or more subject ids are invalid.",
		)


def _validate_known_topic_ids(db: Session, known_topic_ids: list[str]) -> None:
	_ensure_unique_ids(known_topic_ids, "topic")

	if not known_topic_ids:
		return

	existing_ids = {
		row[0]
		for row in db.query(Topic.id).filter(Topic.id.in_(known_topic_ids)).all()
	}
	missing_ids = sorted(set(known_topic_ids) - existing_ids)
	if missing_ids:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="One or more topic ids are invalid.",
		)


def _current_subject_confidence_count(db: Session, user_id: str) -> int:
	return db.query(UserSubjectConfidence).filter(UserSubjectConfidence.user_id == user_id).count()


def _is_profile_complete(
	user: User,
	subject_confidence_count: int,
) -> bool:
	return bool(
		user.exam_target_date
		and user.daily_study_minutes
		and user.experience_level
		and subject_confidence_count > 0
	)


def update_profile(
	db: Session,
	user: User,
	req: UpdateProfileRequest,
) -> User:
	payload = req.model_dump(exclude_unset=True)

	if "full_name" in payload:
		user.full_name = (req.full_name or "").strip() or None
	if "phone" in payload:
		user.phone = (req.phone or "").strip() or None
	if "language" in payload:
		user.language = (req.language or "").strip() or None
	if "timezone" in payload:
		user.timezone = (req.timezone or "").strip() or None
	if "daily_study_minutes" in payload:
		user.daily_study_minutes = req.daily_study_minutes
	if "experience_level" in payload:
		user.experience_level = req.experience_level
	if "email_notifications_enabled" in payload:
		user.email_notifications_enabled = bool(req.email_notifications_enabled)
	if "push_notifications_enabled" in payload:
		user.push_notifications_enabled = bool(req.push_notifications_enabled)
	if "study_reminders_enabled" in payload:
		user.study_reminders_enabled = bool(req.study_reminders_enabled)
	if "exam_target_date" in payload:
		user.exam_target_date = req.exam_target_date

	subject_confidence_count: int | None = None

	if "subject_confidences" in payload and req.subject_confidences is not None:
		_validate_subject_confidences(db, req.subject_confidences)
		db.query(UserSubjectConfidence).filter(
			UserSubjectConfidence.user_id == user.id
		).delete(synchronize_session=False)
		for item in req.subject_confidences:
			db.add(
				UserSubjectConfidence(
					user_id=user.id,
					subject_id=item.subject_id,
					confidence_pct=item.confidence_pct,
					source="onboarding",
				)
			)
		subject_confidence_count = len(req.subject_confidences)

	if "known_topic_ids" in payload and req.known_topic_ids is not None:
		_validate_known_topic_ids(db, req.known_topic_ids)
		db.query(UserTopicBaseline).filter(
			UserTopicBaseline.user_id == user.id
		).delete(synchronize_session=False)
		for topic_id in req.known_topic_ids:
			db.add(
				UserTopicBaseline(
					user_id=user.id,
					topic_id=topic_id,
					already_known=True,
					source="onboarding",
				)
			)

	if subject_confidence_count is None:
		subject_confidence_count = _current_subject_confidence_count(db, str(user.id))

	if _is_profile_complete(user, subject_confidence_count):
		user.onboarding_version = 2
		if user.onboarding_completed_at is None:
			user.onboarding_completed_at = datetime.utcnow()

	db.add(user)
	db.commit()
	db.refresh(user)
	db.expire(user, ["subject_confidences", "topic_baselines"])
	return user
