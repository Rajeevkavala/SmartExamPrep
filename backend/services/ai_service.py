from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from ai.services.ai_tasks import (
    classify_scraped_questions as _classify_scraped_questions,
    generate_dashboard_focus_hint as _generate_dashboard_focus_hint,
    generate_mcqs_from_study_material as _generate_mcqs_from_study_material,
    generate_roadmap_month_enrichment as _generate_roadmap_month_enrichment,
    generate_study_chat_reply as _generate_study_chat_reply,
    generate_weakness_explanation as _generate_weakness_explanation,
    parse_syllabus as _parse_syllabus,
    provider_readiness,
    provider_status,
)


def _run_async(coro: Any) -> Any:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(asyncio.run, coro)
        return future.result()


async def generate_weakness_explanation(**kwargs: Any) -> str:
    return await _generate_weakness_explanation(**kwargs)


def generate_dashboard_focus_hint(**kwargs: Any) -> str:
    return _run_async(_generate_dashboard_focus_hint(**kwargs))


async def generate_study_chat_reply(**kwargs: Any) -> str:
    return await _generate_study_chat_reply(**kwargs)


async def classify_scraped_questions(raw_texts: list[str]) -> list[dict[str, Any]]:
    return await _classify_scraped_questions(raw_texts)


async def parse_syllabus(raw_text: str) -> dict[str, Any]:
    return await _parse_syllabus(raw_text)


async def generate_mcqs_from_study_material(
    raw_text: str,
    max_questions: int = 10,
) -> list[dict[str, Any]]:
    return await _generate_mcqs_from_study_material(raw_text=raw_text, max_questions=max_questions)


def generate_roadmap_month_enrichment(**kwargs: Any) -> dict[str, Any] | None:
    return _run_async(_generate_roadmap_month_enrichment(**kwargs))


__all__ = [
    "classify_scraped_questions",
    "generate_dashboard_focus_hint",
    "generate_mcqs_from_study_material",
    "generate_roadmap_month_enrichment",
    "generate_study_chat_reply",
    "generate_weakness_explanation",
    "parse_syllabus",
    "provider_readiness",
    "provider_status",
]
