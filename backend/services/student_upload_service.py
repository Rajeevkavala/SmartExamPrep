from __future__ import annotations

from pathlib import Path
import re
from typing import Any

import aiofiles
import pdfplumber
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database import SessionLocal
from models.models import ExamCatalog, JobStatusEnum, StudentUpload
from services.ai_service import generate_mcqs_from_study_material


UPLOAD_DIR = Path(settings.upload_dir) / "student-materials"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

QUESTION_START_RE = re.compile(r"^\s*(?:Q(?:uestion)?\s*)?(\d+)[.)\-:]\s*(.+)$", re.IGNORECASE)
OPTION_RE = re.compile(r"^\s*([A-D])[.)\-:]\s*(.+)$", re.IGNORECASE)
ANSWER_RE = re.compile(r"^\s*(?:answer|ans)\s*[:\-]?\s*([A-D])\b", re.IGNORECASE)
EXPLANATION_RE = re.compile(r"^\s*(?:explanation|solution)\s*[:\-]?\s*(.+)$", re.IGNORECASE)


def _normalize_filename(name: str) -> str:
    sanitized = "".join(ch for ch in name if ch.isalnum() or ch in {"-", "_", "."}).strip()
    return sanitized or "upload.pdf"


def _safe_questions(value: object) -> list[dict]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _normalize_question(item: dict[str, Any], index: int) -> dict[str, Any]:
    options = item.get("options")
    safe_options = [str(option).strip() for option in options] if isinstance(options, list) else []

    return {
        "question_id": str(item.get("question_id") or f"upload_q_{index + 1}"),
        "question_text": str(item.get("question_text") or "").strip(),
        "options": safe_options[:4],
        "correct_answer": str(item.get("correct_answer") or "").strip().upper() or None,
        "explanation": str(item.get("explanation") or "").strip() or None,
        "subject_name": str(item.get("subject_name") or item.get("subject") or "").strip() or None,
        "topic_name": str(item.get("topic_name") or item.get("topic") or "").strip() or None,
        "difficulty": str(item.get("difficulty") or "").strip().lower() or None,
        "confidence_label": str(item.get("confidence_label") or "").strip().lower() or None,
    }


def _finalize_parsed_questions(raw_questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    finalized: list[dict[str, Any]] = []
    for index, item in enumerate(raw_questions):
        normalized = _normalize_question(item, index)
        if not normalized["question_text"]:
            continue
        if len(normalized["options"]) < 4:
            continue
        finalized.append(normalized)
    return finalized


def _parse_existing_mcqs(raw_text: str) -> list[dict[str, Any]]:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    parsed: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    def flush_current() -> None:
        nonlocal current
        if current is None:
            return
        parsed.append(current)
        current = None

    for line in lines:
        question_match = QUESTION_START_RE.match(line)
        if question_match:
            flush_current()
            current = {
                "question_id": f"upload_q_{question_match.group(1)}",
                "question_text": question_match.group(2).strip(),
                "options": [],
                "correct_answer": None,
                "explanation": None,
            }
            continue

        if current is None:
            continue

        option_match = OPTION_RE.match(line)
        if option_match:
            current.setdefault("options", []).append(
                f"{option_match.group(1).upper()}. {option_match.group(2).strip()}"
            )
            continue

        answer_match = ANSWER_RE.match(line)
        if answer_match:
            current["correct_answer"] = answer_match.group(1).upper()
            continue

        explanation_match = EXPLANATION_RE.match(line)
        if explanation_match:
            existing = str(current.get("explanation") or "").strip()
            extra = explanation_match.group(1).strip()
            current["explanation"] = f"{existing} {extra}".strip()
            continue

        if len(current.get("options", [])) == 0:
            current["question_text"] = f"{current['question_text']} {line}".strip()
        elif current.get("correct_answer"):
            existing = str(current.get("explanation") or "").strip()
            current["explanation"] = f"{existing} {line}".strip()
        elif len(current.get("options", [])) > 0 and len(current["options"]) < 4:
            last_index = len(current["options"]) - 1
            current["options"][last_index] = f"{current['options'][last_index]} {line}".strip()

    flush_current()
    return _finalize_parsed_questions(parsed)


def extract_pdf_text(file_path: str) -> str:
    text_parts: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _map_lifecycle_state(status_value: object) -> str:
    normalized = str(getattr(status_value, "value", status_value) or "").strip().lower()
    if normalized == "pending":
        return "queued"
    if normalized == "processing":
        return "running"
    if normalized == "done":
        return "completed"
    return "failed"


def _upload_progress_pct(upload: StudentUpload) -> int:
    normalized_status = str(getattr(upload.status, "value", upload.status) or "").strip().lower()
    if normalized_status == "pending":
        return 10
    if normalized_status == "processing":
        if upload.question_count:
            return 85
        if upload.extracted_text_preview:
            return 65
        return 40
    return 100


def _upload_provenance(upload: StudentUpload) -> dict:
    mode = str(upload.processing_mode or "pending")
    used_ai = mode == "ai_generated"
    return {
        "generation_source": mode,
        "fallback_used": used_ai,
        "confidence_label": "high" if mode == "ocr_rule_based" else "medium" if used_ai else "unknown",
        "preview_ready": bool(upload.extracted_text_preview),
    }


def _serialize_generated_questions(questions: object, processing_mode: str) -> list[dict]:
    raw_questions = questions if isinstance(questions, list) else []
    normalized_questions: list[dict] = []
    for index, item in enumerate(raw_questions):
        if not isinstance(item, dict):
            continue
        normalized = _normalize_question(item, index)
        normalized["provenance"] = {
            "source": processing_mode,
            "has_explanation": bool(normalized.get("explanation")),
            "has_answer_key": bool(normalized.get("correct_answer")),
        }
        normalized_questions.append(normalized)
    return normalized_questions


def serialize_student_upload(upload: StudentUpload, include_questions: bool = False) -> dict:
    lifecycle_state = _map_lifecycle_state(upload.status)
    provenance = _upload_provenance(upload)
    payload = {
        "upload_id": str(upload.id),
        "exam_id": str(upload.exam_id) if upload.exam_id else None,
        "exam_title": upload.exam.title if upload.exam else None,
        "filename": upload.filename,
        "file_size_bytes": int(upload.file_size_bytes or 0),
        "status": str(getattr(upload.status, "value", upload.status)),
        "lifecycle_state": lifecycle_state,
        "progress_pct": _upload_progress_pct(upload),
        "processing_mode": upload.processing_mode,
        "question_count": int(upload.question_count or 0),
        "extracted_text_preview": upload.extracted_text_preview,
        "error_message": upload.error_message,
        "can_retry": lifecycle_state == "failed" and bool(upload.upload_path),
        "last_error": upload.error_message,
        "job_summary": {
            "question_count": int(upload.question_count or 0),
            "preview_ready": bool(upload.extracted_text_preview),
            "processing_mode": upload.processing_mode,
        },
        "provenance": provenance,
        "created_at": upload.created_at.isoformat() if upload.created_at else "",
        "updated_at": upload.updated_at.isoformat() if upload.updated_at else "",
    }
    if include_questions:
        payload["questions"] = _serialize_generated_questions(
            upload.generated_questions,
            str(upload.processing_mode or "pending"),
        )
    return payload


def list_student_uploads(user_id: str, db: Session, limit: int = 25) -> list[dict]:
    uploads = (
        db.query(StudentUpload)
        .filter(StudentUpload.user_id == user_id)
        .order_by(StudentUpload.created_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_student_upload(upload) for upload in uploads]


def get_student_upload(user_id: str, upload_id: str, db: Session) -> dict:
    upload = (
        db.query(StudentUpload)
        .filter(StudentUpload.id == upload_id, StudentUpload.user_id == user_id)
        .first()
    )
    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found.",
        )
    return serialize_student_upload(upload, include_questions=True)


def prepare_student_upload_retry(user_id: str, upload_id: str, db: Session) -> tuple[StudentUpload, bytes]:
    upload = (
        db.query(StudentUpload)
        .filter(StudentUpload.id == upload_id, StudentUpload.user_id == user_id)
        .first()
    )
    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found.",
        )
    if str(getattr(upload.status, "value", upload.status)) not in {"failed", "done"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed or failed uploads can be retried.",
        )
    file_path = Path(upload.upload_path)
    if not upload.upload_path or not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Retry is unavailable because the original uploaded PDF is no longer stored.",
        )

    upload.status = JobStatusEnum.pending
    upload.processing_mode = "queued_retry"
    upload.error_message = None
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return upload, file_path.read_bytes()


def delete_student_upload(user_id: str, upload_id: str, db: Session) -> dict:
    upload = (
        db.query(StudentUpload)
        .filter(StudentUpload.id == upload_id, StudentUpload.user_id == user_id)
        .first()
    )
    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found.",
        )

    file_path = Path(upload.upload_path)
    if file_path.exists():
        try:
            file_path.unlink()
        except OSError:
            pass

    db.delete(upload)
    db.commit()
    return {"deleted": True}


async def process_student_upload(upload_id: str, filename: str, file_bytes: bytes) -> None:
    db = SessionLocal()
    upload = db.query(StudentUpload).filter(StudentUpload.id == upload_id).first()

    if upload is None:
        db.close()
        return

    try:
        upload.status = JobStatusEnum.processing
        upload.error_message = None
        db.commit()

        safe_name = _normalize_filename(filename)
        file_path = UPLOAD_DIR / f"{upload_id}_{safe_name}"

        async with aiofiles.open(file_path, "wb") as out_file:
            await out_file.write(file_bytes)

        upload.filename = filename
        upload.upload_path = str(file_path)
        upload.file_size_bytes = len(file_bytes)
        db.commit()

        raw_text = extract_pdf_text(str(file_path))
        if not raw_text.strip():
            raise ValueError(
                "Could not extract text from the uploaded PDF. Please upload a text-based PDF."
            )

        preview = re.sub(r"\s+", " ", raw_text).strip()[:1200]
        upload.extracted_text_preview = preview or None
        db.commit()

        parsed_questions = _parse_existing_mcqs(raw_text)
        processing_mode = "ocr_rule_based" if parsed_questions else "pending"

        if len(parsed_questions) < 3:
            generated_questions = await generate_mcqs_from_study_material(
                raw_text=raw_text,
                max_questions=10,
            )
            generated_questions = _finalize_parsed_questions(_safe_questions(generated_questions))
            if generated_questions:
                parsed_questions = generated_questions
                processing_mode = "ai_generated"

        if not parsed_questions:
            raise ValueError(
                "Could not convert this PDF into MCQs yet. Upload a question bank style PDF or configure Groq for AI generation."
            )

        upload.generated_questions = parsed_questions
        upload.question_count = len(parsed_questions)
        upload.processing_mode = processing_mode
        upload.status = JobStatusEnum.done
        upload.error_message = None
        db.commit()
    except Exception as exc:
        upload.status = JobStatusEnum.failed
        upload.processing_mode = "failed"
        upload.error_message = str(exc)
        db.commit()
    finally:
        db.close()


def validate_exam_for_upload(db: Session, exam_id: str | None) -> ExamCatalog | None:
    if not exam_id:
        return None

    exam = db.query(ExamCatalog).filter(ExamCatalog.id == exam_id, ExamCatalog.is_active.is_(True)).first()
    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected exam was not found.",
        )
    return exam
