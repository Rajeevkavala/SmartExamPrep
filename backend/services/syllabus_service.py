from __future__ import annotations

from pathlib import Path
import re
from typing import Any

import aiofiles
import pdfplumber
from sqlalchemy.orm import Session

from config import settings
from database import SessionLocal
from models.models import JobStatusEnum, Subject, SyllabusUpload, Topic
from services.ai_service import parse_syllabus


UPLOAD_DIR = Path(settings.upload_dir) / "syllabi"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


_SECTION_PATTERN = re.compile(
    r"Section\s+\d+\s*:\s*(?P<subject>[^\n]+)\n(?P<body>.*?)(?=(?:\nSection\s+\d+\s*:)|\Z)",
    re.IGNORECASE | re.DOTALL,
)


def _normalize_text_line(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" .|;:-\t")


def _split_subtopics(value: str) -> list[str]:
    value = _normalize_text_line(value)
    if not value:
        return []

    parts = re.split(r"[.;]", value)
    candidates: list[str] = []
    for part in parts:
        cleaned = _normalize_text_line(part)
        if cleaned and cleaned not in candidates:
            candidates.append(cleaned)
    return candidates[:10]


def _extract_topics_from_section_body(body: str) -> list[dict[str, Any]]:
    normalized_body = _normalize_text_line(body.replace("\n", " "))
    if not normalized_body:
        return []

    topic_matches = list(
        re.finditer(
            r"([A-Za-z][A-Za-z0-9+&()/,\- ]{1,90}?)\s*:\s*",
            normalized_body,
        )
    )

    topics: list[dict[str, Any]] = []
    seen_names: set[str] = set()

    if topic_matches:
        for index, match in enumerate(topic_matches):
            topic_name = _normalize_text_line(match.group(1))
            topic_key = topic_name.lower()
            if not topic_name or topic_key in seen_names:
                continue

            start = match.end()
            end = topic_matches[index + 1].start() if index + 1 < len(topic_matches) else len(normalized_body)
            subtopics = _split_subtopics(normalized_body[start:end])

            topics.append(
                {
                    "name": topic_name,
                    "subtopics": subtopics,
                }
            )
            seen_names.add(topic_key)
        return topics

    # Fallback: treat period-separated statements as topic names for sections without explicit colons.
    for sentence in re.split(r"[.;]", normalized_body):
        topic_name = _normalize_text_line(sentence)
        topic_key = topic_name.lower()
        if not topic_name or topic_key in seen_names:
            continue
        topics.append({"name": topic_name, "subtopics": []})
        seen_names.add(topic_key)
        if len(topics) >= 12:
            break

    return topics


def _has_subjects(value: object) -> bool:
    return bool(
        isinstance(value, dict)
        and isinstance(value.get("subjects"), list)
        and len(value.get("subjects", [])) > 0
    )


def parse_syllabus_with_rules(raw_text: str) -> dict[str, Any]:
    subjects: list[dict[str, Any]] = []
    seen_subjects: set[str] = set()

    for match in _SECTION_PATTERN.finditer(raw_text):
        subject_name = _normalize_text_line(match.group("subject"))
        subject_key = subject_name.lower()
        if not subject_name or subject_key in seen_subjects:
            continue

        topics = _extract_topics_from_section_body(match.group("body"))
        if not topics:
            continue

        subjects.append(
            {
                "name": subject_name,
                "topics": topics,
            }
        )
        seen_subjects.add(subject_key)

    return {"subjects": subjects}


def _normalize_filename(name: str) -> str:
    sanitized = "".join(ch for ch in name if ch.isalnum() or ch in {"-", "_", "."}).strip()
    return sanitized or "syllabus.pdf"


async def process_syllabus_upload(upload_id: str, filename: str, file_bytes: bytes) -> None:
    """Background task: persist PDF, extract text, parse with AI, persist structure."""
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
        if not raw_text.strip():
            raise ValueError(
                "Could not extract text from PDF. Please upload a text-based PDF (not image-only scans)."
            )

        parsed_structure = await parse_syllabus(raw_text)
        if not _has_subjects(parsed_structure):
            parsed_structure = parse_syllabus_with_rules(raw_text)

        if not _has_subjects(parsed_structure):
            raise ValueError(
                "Could not extract subjects/topics from syllabus. Please try a clearer PDF or provide structure manually."
            )

        upload.extracted_structure = parsed_structure
        upload.status = JobStatusEnum.done
        upload.error_message = None
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

    # Recovery path: older uploads may have been marked done with empty AI output.
    if not subjects_data and upload.upload_path:
        try:
            raw_text = extract_pdf_text(upload.upload_path)
            fallback_structure = parse_syllabus_with_rules(raw_text)
            if _has_subjects(fallback_structure):
                structure = fallback_structure
                subjects_data = fallback_structure.get("subjects", [])
                upload.extracted_structure = fallback_structure
        except Exception:
            pass

    if not subjects_data:
        return {"error": "No subjects found in the extracted syllabus structure."}

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
