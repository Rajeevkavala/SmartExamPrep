from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from dependencies import get_db, require_admin
from ml.nlp_pipeline import extract_tags
from models.models import DifficultyEnum, Question, SourceTypeEnum, Subject, Topic, User
from schemas.admin_schemas import BulkVerifyRequest, QuestionCreate, QuestionUpdate

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


def _normalize_difficulty(value: str) -> DifficultyEnum:
	mapped = value.strip().lower()
	for item in DifficultyEnum:
		if item.value.lower() == mapped:
			return item
	raise HTTPException(
		status_code=status.HTTP_400_BAD_REQUEST,
		detail="Invalid difficulty. Allowed values: easy, medium, hard.",
	)


def _normalize_source_type(value: str) -> SourceTypeEnum:
	mapped = value.strip().lower()
	if mapped == "pyq":
		return SourceTypeEnum.PYQ
	if mapped == "practice":
		return SourceTypeEnum.practice
	if mapped == "scraped":
		return SourceTypeEnum.scraped
	raise HTTPException(
		status_code=status.HTTP_400_BAD_REQUEST,
		detail="Invalid source_type. Allowed values: PYQ, practice, scraped.",
	)


def _enum_value(value: object | None) -> str | None:
	if value is None:
		return None
	return getattr(value, "value", str(value))


def _validate_options(options: list[str]) -> None:
	if len(options) != 4:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Exactly 4 options (A-D) are required.",
		)
	if any(not (option or "").strip() for option in options):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Options A-D cannot be empty.",
		)


def _validate_correct_answer(answer: str, options: list[str]) -> None:
	normalized = answer.strip().upper()
	valid_letters = ["A", "B", "C", "D"]
	if normalized not in valid_letters:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="correct_answer must be one of A, B, C, or D.",
		)
	if len(options) < valid_letters.index(normalized) + 1:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="correct_answer does not match available options.",
		)


def _question_to_dict(question: Question) -> dict:
	return {
		"id": str(question.id),
		"subject_id": str(question.subject_id),
		"topic_id": str(question.topic_id),
		"subject_name": question.subject.name if question.subject else None,
		"topic_name": question.topic.name if question.topic else None,
		"subtopic": question.subtopic,
		"question_text": question.question_text,
		"options": list(question.options or []),
		"question_image_urls": list(question.question_image_urls or []),
		"correct_answer": question.correct_answer,
		"explanation": question.explanation,
		"difficulty": _enum_value(question.difficulty),
		"source_type": _enum_value(question.source_type),
		"source_url": question.source_url,
		"year": question.year,
		"nlp_keyword_tags": list(question.nlp_keyword_tags or []),
		"is_verified": bool(question.is_verified),
		"created_by": str(question.created_by) if question.created_by else None,
		"scrape_job_id": str(question.scrape_job_id) if question.scrape_job_id else None,
		"created_at": question.created_at.isoformat() if question.created_at else None,
		"updated_at": question.updated_at.isoformat() if question.updated_at else None,
	}


def _get_question_or_404(db: Session, question_id: str) -> Question:
	question_id = _require_uuid(question_id, "question_id")
	question = (
		db.query(Question)
		.options(joinedload(Question.subject), joinedload(Question.topic))
		.filter(Question.id == question_id)
		.first()
	)
	if question is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Question not found.",
		)
	return question


@router.get("/", summary="List questions with filters and pagination")
def list_questions(
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
	subject_id: str | None = Query(default=None),
	topic_id: str | None = Query(default=None),
	difficulty: str | None = Query(default=None),
	source_type: str | None = Query(default=None),
	is_verified: bool | None = Query(default=None),
	year: int | None = Query(default=None),
	search: str | None = Query(default=None),
	limit: int = Query(default=20, ge=1, le=100),
	offset: int = Query(default=0, ge=0),
) -> dict:
	_ = admin
	query = db.query(Question).options(joinedload(Question.subject), joinedload(Question.topic))

	if subject_id:
		subject_id = _require_uuid(subject_id, "subject_id")
		query = query.filter(Question.subject_id == subject_id)
	if topic_id:
		topic_id = _require_uuid(topic_id, "topic_id")
		query = query.filter(Question.topic_id == topic_id)
	if difficulty:
		query = query.filter(Question.difficulty == _normalize_difficulty(difficulty))
	if source_type:
		query = query.filter(Question.source_type == _normalize_source_type(source_type))
	if is_verified is not None:
		query = query.filter(Question.is_verified.is_(is_verified))
	if year is not None:
		query = query.filter(Question.year == year)
	if search:
		search_term = search.strip()
		if search_term:
			query = query.filter(Question.question_text.ilike(f"%{search_term}%"))

	total = query.count()
	questions = (
		query.order_by(Question.updated_at.desc(), Question.created_at.desc())
		.offset(offset)
		.limit(limit)
		.all()
	)

	return {
		"total": int(total),
		"limit": int(limit),
		"offset": int(offset),
		"questions": [_question_to_dict(question) for question in questions],
	}


@router.get("/{question_id}", summary="Get question by id")
def get_question(
	question_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	question = _get_question_or_404(db, question_id)
	return _question_to_dict(question)


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Create a question")
def create_question(
	req: QuestionCreate,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	subject_id = _require_uuid(req.subject_id, "subject_id")
	topic_id = _require_uuid(req.topic_id, "topic_id")
	question_text = req.question_text.strip()
	if not question_text:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="question_text cannot be empty.",
		)

	subject = db.query(Subject).filter(Subject.id == subject_id).first()
	if subject is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Subject not found.",
		)

	topic = db.query(Topic).filter(Topic.id == topic_id).first()
	if topic is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Topic not found.",
		)
	if str(topic.subject_id) != str(subject_id):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Topic does not belong to the provided subject.",
		)

	_validate_options(req.options)
	_validate_correct_answer(req.correct_answer, req.options)

	question = Question(
		subject_id=subject_id,
		topic_id=topic_id,
		subtopic=req.subtopic,
		question_text=question_text,
		options=req.options,
		question_image_urls=req.question_image_urls,
		correct_answer=req.correct_answer.strip().upper(),
		explanation=req.explanation,
		difficulty=_normalize_difficulty(req.difficulty),
		source_type=_normalize_source_type(req.source_type),
		source_url=req.source_url,
		year=req.year,
		nlp_keyword_tags=extract_tags(question_text),
		is_verified=True,
		created_by=str(admin.id),
	)

	db.add(question)
	db.commit()
	db.refresh(question)

	question = _get_question_or_404(db, str(question.id))
	return _question_to_dict(question)


@router.put("/{question_id}", summary="Partially update a question")
def update_question(
	question_id: str,
	req: QuestionUpdate,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	question = _get_question_or_404(db, question_id)
	updates = req.model_dump(exclude_unset=True)

	if "subject_id" in updates:
		if updates["subject_id"] is None:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="subject_id cannot be null.",
			)
		updates["subject_id"] = _require_uuid(updates["subject_id"], "subject_id")

	if "topic_id" in updates:
		if updates["topic_id"] is None:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="topic_id cannot be null.",
			)
		updates["topic_id"] = _require_uuid(updates["topic_id"], "topic_id")

	if "subject_id" in updates or "topic_id" in updates:
		target_subject_id = updates.get("subject_id") or str(question.subject_id)
		target_topic_id = updates.get("topic_id") or str(question.topic_id)

		subject = db.query(Subject).filter(Subject.id == target_subject_id).first()
		if subject is None:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Subject not found.",
			)

		topic = db.query(Topic).filter(Topic.id == target_topic_id).first()
		if topic is None:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Topic not found.",
			)
		if str(topic.subject_id) != str(target_subject_id):
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Topic does not belong to the provided subject.",
			)

		updates["subject_id"] = target_subject_id
		updates["topic_id"] = target_topic_id

	if "options" in updates and updates["options"] is not None:
		_validate_options(updates["options"])

	if "correct_answer" in updates and updates["correct_answer"] is not None:
		options_for_validation = updates.get("options") or list(question.options or [])
		_validate_correct_answer(updates["correct_answer"], options_for_validation)
		updates["correct_answer"] = updates["correct_answer"].strip().upper()

	if "difficulty" in updates and updates["difficulty"] is not None:
		updates["difficulty"] = _normalize_difficulty(updates["difficulty"])

	if "source_type" in updates and updates["source_type"] is not None:
		updates["source_type"] = _normalize_source_type(updates["source_type"])

	if "question_text" in updates and updates["question_text"] is not None:
		updates["question_text"] = updates["question_text"].strip()
		if not updates["question_text"]:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="question_text cannot be empty.",
			)
		updates["nlp_keyword_tags"] = extract_tags(updates["question_text"])

	if "question_image_urls" in updates and updates["question_image_urls"] is None:
		updates["question_image_urls"] = []

	for key, value in updates.items():
		setattr(question, key, value)

	db.commit()
	db.refresh(question)

	question = _get_question_or_404(db, question_id)
	return _question_to_dict(question)


@router.delete("/{question_id}", summary="Delete a question")
def delete_question(
	question_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	question = _get_question_or_404(db, question_id)
	db.delete(question)
	db.commit()

	return {"deleted": True, "question_id": question_id}


@router.post("/{question_id}/verify", summary="Mark a question as verified")
def verify_question(
	question_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	question = _get_question_or_404(db, question_id)
	question.is_verified = True
	db.commit()

	return {"verified": True, "question_id": question_id}


@router.post("/bulk-verify", summary="Bulk verify selected questions")
def bulk_verify_questions(
	req: BulkVerifyRequest,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	question_ids = [
		_require_uuid(question_id, "question_id")
		for question_id in list(dict.fromkeys(req.question_ids))
	]
	if not question_ids:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="question_ids cannot be empty.",
		)

	existing_ids = {
		str(question_id)
		for (question_id,) in db.query(Question.id).filter(Question.id.in_(question_ids)).all()
	}

	updated_count = (
		db.query(Question)
		.filter(Question.id.in_(question_ids))
		.update({Question.is_verified: True}, synchronize_session=False)
	)
	db.commit()

	missing_ids = [question_id for question_id in question_ids if question_id not in existing_ids]

	return {
		"verified_count": int(updated_count),
		"requested_count": len(question_ids),
		"not_found_ids": missing_ids,
	}
