from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.models import ExamCatalog, Question, QuizAttempt, SourceTypeEnum, Subject, Topic


DEFAULT_EXAMS = [
    {
        "code": "gate-cse",
        "title": "GATE Computer Science",
        "category": "Engineering",
        "description": (
            "End-to-end GATE CSE prep with roadmap generation, topic prediction, "
            "mock tests, uploads, and PYQ practice."
        ),
        "sort_order": 1,
    }
]


def _safe_subject_ids(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def ensure_default_exam_catalog(db: Session) -> list[ExamCatalog]:
    existing = db.query(ExamCatalog).order_by(ExamCatalog.sort_order.asc(), ExamCatalog.title.asc()).all()
    if existing:
        all_subject_ids = [str(subject_id) for (subject_id,) in db.query(Subject.id).all()]
        changed = False
        for exam in existing:
            if exam.code == "gate-cse":
                current_subject_ids = _safe_subject_ids(exam.subject_ids)
                if all_subject_ids and current_subject_ids != all_subject_ids:
                    exam.subject_ids = all_subject_ids
                    db.add(exam)
                    changed = True
        if changed:
            db.commit()
            existing = (
                db.query(ExamCatalog)
                .order_by(ExamCatalog.sort_order.asc(), ExamCatalog.title.asc())
                .all()
            )
        return existing

    all_subject_ids = [str(subject_id) for (subject_id,) in db.query(Subject.id).all()]

    created: list[ExamCatalog] = []
    for item in DEFAULT_EXAMS:
        exam = ExamCatalog(
            code=item["code"],
            title=item["title"],
            category=item["category"],
            description=item["description"],
            subject_ids=all_subject_ids if item["code"] == "gate-cse" else [],
            sort_order=item["sort_order"],
            is_active=True,
        )
        db.add(exam)
        created.append(exam)

    db.commit()
    for exam in created:
        db.refresh(exam)
    return created


def get_exam_or_404(db: Session, exam_id: str) -> ExamCatalog:
    ensure_default_exam_catalog(db)
    exam = (
        db.query(ExamCatalog)
        .filter(ExamCatalog.id == exam_id, ExamCatalog.is_active.is_(True))
        .first()
    )
    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found.",
        )
    return exam


def _count_topics(db: Session, exam: ExamCatalog) -> int:
    subject_ids = _safe_subject_ids(exam.subject_ids)
    if subject_ids:
        return (
            db.query(Topic)
            .filter(Topic.subject_id.in_(subject_ids))
            .count()
        )
    return int(exam.topic_count_override or 0)


def _count_pyqs(db: Session, exam: ExamCatalog) -> int:
    subject_ids = _safe_subject_ids(exam.subject_ids)
    query = db.query(Question).filter(
        Question.source_type == SourceTypeEnum.PYQ,
        Question.is_verified.is_(True),
    )
    if subject_ids:
        query = query.filter(Question.subject_id.in_(subject_ids))
    count = query.count()
    return int(count or exam.pyq_count_override or 0)


def _count_enrollments(db: Session, exam: ExamCatalog) -> int:
    matched_user_ids: set[str] = set()
    attempts = db.query(QuizAttempt.user_id, QuizAttempt.context_payload).all()
    for user_id, context_payload in attempts:
        if not user_id or not isinstance(context_payload, dict):
            continue

        exam_id = str(context_payload.get("exam_id") or context_payload.get("mock_exam_id") or "")
        if exam_id == str(exam.id):
            matched_user_ids.add(str(user_id))

    return max(len(matched_user_ids), int(exam.enrolled_count_override or 0))


def serialize_exam_catalog_item(exam: ExamCatalog, db: Session) -> dict:
    return {
        "exam_id": str(exam.id),
        "code": exam.code,
        "title": exam.title,
        "category": exam.category,
        "description": exam.description,
        "topic_count": _count_topics(db, exam),
        "pyq_count": _count_pyqs(db, exam),
        "enrolled_count": _count_enrollments(db, exam),
    }


def list_exam_catalog(db: Session) -> list[dict]:
    exams = ensure_default_exam_catalog(db)
    active_exams = [exam for exam in exams if bool(exam.is_active)]
    return [serialize_exam_catalog_item(exam, db) for exam in active_exams]
