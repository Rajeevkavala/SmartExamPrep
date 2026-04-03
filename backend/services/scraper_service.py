from __future__ import annotations

from collections.abc import Iterable
from typing import Any
from urllib.parse import urljoin
import re

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from database import SessionLocal
from ml.nlp_pipeline import extract_tags
from models.models import (
    DifficultyEnum,
    JobStatusEnum,
    Question,
    ScrapeJob,
    SourceTypeEnum,
    Subject,
    Topic,
)
from services.gemini_service import classify_questions_with_gemini


def _normalize_options(raw_options: object) -> list[str]:
    if not isinstance(raw_options, list):
        return []
    cleaned = [str(item).strip() for item in raw_options if str(item).strip()]
    return cleaned[:6]


def _normalize_correct_answer(raw_value: object) -> str:
    text = str(raw_value or "").strip().upper()
    if not text:
        return ""

    if text[0] in {"A", "B", "C", "D"}:
        return text[0]

    match = re.search(r"\b([ABCD])\b", text)
    if match:
        return match.group(1)

    return ""


def _normalize_difficulty(raw_difficulty: object) -> DifficultyEnum:
    value = str(raw_difficulty or "medium").strip().lower()
    if value not in {"easy", "medium", "hard"}:
        value = "medium"
    return DifficultyEnum(value)


def _normalize_year(raw_year: object) -> int | None:
    if raw_year in {None, "", "null"}:
        return None
    try:
        year = int(str(raw_year).strip())
    except (TypeError, ValueError):
        return None
    if 1980 <= year <= 2100:
        return year
    return None


def _extract_image_urls(element: object, base_url: str) -> list[str]:
    if not hasattr(element, "find_all"):
        return []

    urls: list[str] = []
    for img in element.find_all("img"):  # type: ignore[attr-defined]
        src = img.get("src") or img.get("data-src")
        if not src:
            continue
        abs_url = urljoin(base_url, src.strip())
        if abs_url and abs_url not in urls:
            urls.append(abs_url)
    return urls[:5]


def parse_html_questions(html: str, source_url: str) -> list[str]:
    """Extract candidate question blocks with nearby image URL context."""
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    candidates: list[str] = []

    selectors = [
        ".question-body",
        ".qtext",
        ".question",
        "article p",
        "li",
        "p",
    ]

    for selector in selectors:
        for element in soup.select(selector):
            text = element.get_text(separator=" ", strip=True)
            if len(text) < 60:
                continue
            if not any(marker in text for marker in ["A.", "B.", "(A)", "(B)"]):
                continue

            image_urls = _extract_image_urls(element, source_url)
            combined = text
            if image_urls:
                combined = f"{text}\nImage URLs: {', '.join(image_urls)}"

            normalized = combined.strip()
            if normalized in seen:
                continue
            seen.add(normalized)
            candidates.append(normalized[:2200])

            if len(candidates) >= 20:
                return candidates

    return candidates


async def run_scrape_job(job_id: str, url: str) -> None:
    """Background task: fetch HTML -> parse candidates -> Gemini classify -> persist results."""
    db = SessionLocal()
    job: Any = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()

    if not job:
        db.close()
        return

    try:
        job.status = JobStatusEnum.processing
        job.error_message = None
        db.commit()

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            html = response.text

        job.raw_html = html[:50000]
        db.commit()

        raw_questions = parse_html_questions(html, url)
        if not raw_questions:
            job.status = JobStatusEnum.failed
            job.error_message = "No question-like content found at this URL."
            db.commit()
            return

        structured = await classify_questions_with_gemini(raw_questions)
        job.extracted_questions = structured
        job.status = JobStatusEnum.done
        if not structured:
            job.error_message = "No structured questions could be classified from scraped content."
        db.commit()
    except Exception as exc:
        job.status = JobStatusEnum.failed
        job.error_message = str(exc)
        db.commit()
    finally:
        db.close()


def _find_subject(db: Session, subject_name: str) -> Subject | None:
    return db.query(Subject).filter(Subject.name.ilike(subject_name)).first()


def _find_topic(db: Session, subject_id: str, topic_name: str) -> Topic | None:
    return (
        db.query(Topic)
        .filter(
            Topic.subject_id == subject_id,
            Topic.name.ilike(topic_name),
        )
        .first()
    )


def _iter_accepted_indices(accepted_indices: Iterable[int], max_size: int) -> Iterable[int]:
    seen: set[int] = set()
    for index in accepted_indices:
        if not isinstance(index, int):
            continue
        if index < 0 or index >= max_size:
            continue
        if index in seen:
            continue
        seen.add(index)
        yield index


def import_scraped_questions(
    job_id: str,
    accepted_indices: list[int],
    admin_id: str,
    db: Session,
) -> int:
    """Import reviewed questions from a scrape job into Question table."""
    job: Any = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
    extracted = list(job.extracted_questions or []) if job else []
    if not job or not extracted:
        return 0

    imported_count = 0

    for idx in _iter_accepted_indices(accepted_indices, len(extracted)):
        candidate = extracted[idx]
        if not isinstance(candidate, dict):
            continue

        question_text = str(candidate.get("question_text", "")).strip()
        options = _normalize_options(candidate.get("options"))
        correct_answer = _normalize_correct_answer(candidate.get("correct_answer"))
        subject_name = str(candidate.get("subject", "")).strip()
        topic_name = str(candidate.get("topic", "")).strip()

        if not question_text or not options or not correct_answer:
            continue
        if not subject_name or not topic_name:
            continue

        subject = _find_subject(db, subject_name)
        if not subject:
            continue

        topic = _find_topic(db, str(subject.id), topic_name)
        if not topic:
            continue

        image_urls_raw = candidate.get("question_image_urls", [])
        image_urls = [str(url).strip() for url in image_urls_raw if str(url).strip()] if isinstance(image_urls_raw, list) else []

        question = Question(
            subject_id=str(subject.id),
            topic_id=str(topic.id),
            subtopic=str(candidate.get("subtopic", "")).strip() or None,
            question_text=question_text,
            options=options,
            question_image_urls=image_urls,
            correct_answer=correct_answer,
            explanation=str(candidate.get("explanation", "")).strip() or None,
            difficulty=_normalize_difficulty(candidate.get("difficulty")),
            source_type=SourceTypeEnum.scraped,
            source_url=job.url,
            year=_normalize_year(candidate.get("year")),
            nlp_keyword_tags=extract_tags(question_text),
            is_verified=True,
            created_by=admin_id,
            scrape_job_id=str(job.id),
        )
        db.add(question)
        imported_count += 1

    if imported_count > 0:
        job.questions_imported = int(job.questions_imported or 0) + imported_count
    db.commit()
    return imported_count
