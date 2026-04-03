from __future__ import annotations

from pathlib import Path
from typing import Any

import aiofiles
import pdfplumber
from sqlalchemy.orm import Session

from config import settings
from database import SessionLocal
from models.models import JobStatusEnum, Subject, SyllabusUpload, Topic
from services.gemini_service import parse_syllabus_with_gemini


UPLOAD_DIR = Path(settings.upload_dir) / "syllabi"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _normalize_filename(name: str) -> str:
    sanitized = "".join(ch for ch in name if ch.isalnum() or ch in {"-", "_", "."}).strip()
    return sanitized or "syllabus.pdf"


async def process_syllabus_upload(upload_id: str, filename: str, file_bytes: bytes) -> None:
    """Background task: persist PDF, extract text, parse with Gemini, persist structure."""
    db = SessionLocal()
    upload: Any = db.query(SyllabusUpload).filter(SyllabusUpload.id == upload_id).first()

    if not upload:
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
        db.commit()

        raw_text = extract_pdf_text(str(file_path))
        parsed_structure = await parse_syllabus_with_gemini(raw_text)

        upload.extracted_structure = parsed_structure
        upload.status = JobStatusEnum.done
        db.commit()
    except Exception as exc:
        upload.status = JobStatusEnum.failed
        upload.error_message = str(exc)
        db.commit()
    finally:
        db.close()


def extract_pdf_text(file_path: str) -> str:
    text_parts: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _clean_subtopics(raw_subtopics: object) -> list[str]:
    if not isinstance(raw_subtopics, list):
        return []
    cleaned: list[str] = []
    for item in raw_subtopics:
        text = str(item).strip()
        if text and text not in cleaned:
            cleaned.append(text)
    return cleaned


def import_syllabus_to_db(
    upload_id: str,
    override_structure: dict | None,
    admin_id: str,
    db: Session,
) -> dict:
    _ = admin_id
    upload: Any = db.query(SyllabusUpload).filter(SyllabusUpload.id == upload_id).first()
    if not upload:
        return {"error": "Upload not found."}

    structure = override_structure or upload.extracted_structure
    if not isinstance(structure, dict):
        return {"error": "No extracted structure available."}

    subjects_data = structure.get("subjects", [])
    if not isinstance(subjects_data, list):
        return {"error": "Invalid syllabus structure. Expected a subjects list."}

    subjects_created = 0
    topics_created = 0

    for subject_item in subjects_data:
        if not isinstance(subject_item, dict):
            continue

        subject_name = str(subject_item.get("name", "")).strip()
        if not subject_name:
            continue

        subject = db.query(Subject).filter(Subject.name.ilike(subject_name)).first()
        if not subject:
            subject = Subject(name=subject_name)
            db.add(subject)
            db.flush()
            subjects_created += 1

        topics = subject_item.get("topics", [])
        if not isinstance(topics, list):
            continue

        for topic_item in topics:
            if not isinstance(topic_item, dict):
                continue

            topic_name = str(topic_item.get("name", "")).strip()
            if not topic_name:
                continue

            incoming_subtopics = _clean_subtopics(topic_item.get("subtopics", []))
            topic: Any = (
                db.query(Topic)
                .filter(
                    Topic.subject_id == str(subject.id),
                    Topic.name.ilike(topic_name),
                )
                .first()
            )

            if not topic:
                topic = Topic(
                    subject_id=str(subject.id),
                    name=topic_name,
                    subtopics=incoming_subtopics,
                )
                db.add(topic)
                topics_created += 1
                continue

            existing_subtopics = list(topic.subtopics or [])
            merged = existing_subtopics.copy()
            for subtopic in incoming_subtopics:
                if subtopic not in merged:
                    merged.append(subtopic)
            topic.subtopics = merged

    upload.subjects_imported = int(upload.subjects_imported or 0) + subjects_created
    upload.topics_imported = int(upload.topics_imported or 0) + topics_created
    db.commit()

    return {
        "subjects_created": subjects_created,
        "topics_created": topics_created,
    }
