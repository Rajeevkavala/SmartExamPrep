from __future__ import annotations

import asyncio
import hashlib
import json
from typing import Any

from ai.cache import InMemoryTTLCache
from ai.models.model_registry import WORKLOAD_PROFILES
from ai.models.routing_policy import get_workload_profile
from ai.prompts import (
    dashboard_hint,
    mcq_generation,
    roadmap_enrichment,
    scraper_structuring,
    study_chat,
    syllabus_parsing,
    weak_explanation,
)
from ai.services.ai_router import AIRouter
from ai.types import AIWorkload
from ai.validators.response_safety import normalize_plain_text


FALLBACK_EXPLANATIONS = {
    "Weak": (
        "This topic needs immediate attention. Start with the core idea, review one small sub-area at a time, "
        "and then solve 8 to 10 easy questions before moving to tougher sets."
    ),
    "Moderate": (
        "You have some understanding here, but your mistakes still show a few gaps. "
        "Revise the confusing sub-areas first and then practice mixed questions to stabilize accuracy."
    ),
    "Strong": (
        "This topic is in a healthy place right now. Keep it warm with occasional revision and a short practice block."
    ),
}

_router = AIRouter()
_text_cache: InMemoryTTLCache[str] = InMemoryTTLCache()
_json_cache: InMemoryTTLCache[dict[str, Any]] = InMemoryTTLCache()


def provider_status() -> dict[str, bool]:
    return _router.provider_status()


def provider_readiness() -> dict[str, Any]:
    providers = provider_status()
    configured_providers = sorted(
        provider for provider, is_configured in providers.items() if is_configured
    )

    workloads: dict[str, list[dict[str, Any]]] = {}
    unconfigured_workloads: list[str] = []

    for workload, profile in WORKLOAD_PROFILES.items():
        routes: list[dict[str, Any]] = []
        has_configured_route = False

        for route in profile.routes:
            is_configured = bool(providers.get(route.provider.value, False))
            routes.append(
                {
                    "provider": route.provider.value,
                    "model": route.model,
                    "configured": is_configured,
                }
            )
            has_configured_route = has_configured_route or is_configured

        workloads[workload.value] = routes
        if not has_configured_route:
            unconfigured_workloads.append(workload.value)

    return {
        "providers": providers,
        "configured_providers": configured_providers,
        "configured_provider_count": len(configured_providers),
        "workload_count": len(workloads),
        "workloads": workloads,
        "unconfigured_workloads": sorted(unconfigured_workloads),
    }


def _mastery_level_from_score(weakness_score: float) -> str:
    if weakness_score >= 60:
        return "Weak"
    if weakness_score >= 30:
        return "Moderate"
    return "Strong"


def _hash_cache_key(prefix: str, payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, ensure_ascii=True, sort_keys=True)
    return hashlib.md5(f"{prefix}:{raw}".encode("utf-8")).hexdigest()


def _dashboard_hint_fallback(
    *,
    topic_name: str,
    weakness_score: float,
    roadmap_focus_label: str,
    today_plan_status: str,
) -> str:
    focus_text = roadmap_focus_label.strip() or topic_name.strip() or "your weak topic"
    if today_plan_status == "active":
        return (
            f"Stay with {focus_text} for your next focused block. "
            f"Spend 30 to 45 minutes on {topic_name}, then finish with a short targeted practice set."
        )
    if weakness_score >= 60:
        return (
            f"Start today with {topic_name} because it is still one of your weakest areas. "
            "Review the core concept first, then solve a short timed set before switching topics."
        )
    return (
        f"Use your next study block to reinforce {focus_text}. "
        f"Do one quick review of {topic_name} and then validate it with practice questions."
    )


async def generate_weakness_explanation(
    *,
    topic_name: str,
    subject_name: str,
    weakness_score: float,
    accuracy: float,
    repeated_mistakes: int,
    avg_response_time_s: float,
    user_id: str,
    topic_id: str,
) -> str:
    profile = get_workload_profile(AIWorkload.WEAKNESS_EXPLANATION)
    cache_key = _hash_cache_key(
        "weakness_explanation",
        {
            "user_id": user_id or "anon",
            "topic_id": topic_id or "topic",
            "bucket": int(max(0.0, min(100.0, weakness_score)) // 5),
        },
    )
    cached = _text_cache.get(cache_key)
    if cached:
        return cached

    fallback_text = FALLBACK_EXPLANATIONS[_mastery_level_from_score(weakness_score)]
    response = await _router.complete_text(
        workload=AIWorkload.WEAKNESS_EXPLANATION,
        messages=weak_explanation.build_messages(
            topic_name=topic_name,
            subject_name=subject_name,
            weakness_score=weakness_score,
            accuracy=accuracy,
            repeated_mistakes=repeated_mistakes,
            avg_response_time_s=avg_response_time_s,
        ),
        temperature=0.2,
        max_tokens=180,
    )
    if response is None:
        _text_cache.set(cache_key, fallback_text, profile.cache_ttl_seconds)
        return fallback_text

    cleaned = normalize_plain_text(response.content, max_sentences=3, max_chars=420)
    result = cleaned or fallback_text
    _text_cache.set(cache_key, result, profile.cache_ttl_seconds)
    return result


async def generate_dashboard_focus_hint(
    *,
    topic_name: str,
    subject_name: str,
    weakness_score: float,
    roadmap_focus_label: str,
    today_plan_status: str,
) -> str:
    profile = get_workload_profile(AIWorkload.DASHBOARD_FOCUS_HINT)
    cache_key = _hash_cache_key(
        "dashboard_focus",
        {
            "topic_name": topic_name,
            "subject_name": subject_name,
            "score_bucket": int(max(0.0, min(100.0, weakness_score)) // 5),
            "roadmap_focus_label": roadmap_focus_label,
            "today_plan_status": today_plan_status,
        },
    )
    cached = _text_cache.get(cache_key)
    if cached:
        return cached

    fallback_text = _dashboard_hint_fallback(
        topic_name=topic_name,
        weakness_score=weakness_score,
        roadmap_focus_label=roadmap_focus_label,
        today_plan_status=today_plan_status,
    )
    response = await _router.complete_text(
        workload=AIWorkload.DASHBOARD_FOCUS_HINT,
        messages=dashboard_hint.build_messages(
            topic_name=topic_name,
            subject_name=subject_name,
            weakness_score=weakness_score,
            roadmap_focus_label=roadmap_focus_label,
            today_plan_status=today_plan_status,
        ),
        temperature=0.15,
        max_tokens=120,
    )
    if response is None:
        _text_cache.set(cache_key, fallback_text, profile.cache_ttl_seconds)
        return fallback_text

    cleaned = normalize_plain_text(response.content, max_sentences=2, max_chars=240)
    result = cleaned or fallback_text
    _text_cache.set(cache_key, result, profile.cache_ttl_seconds)
    return result


async def generate_study_chat_reply(
    *,
    user_message: str,
    intent: str,
    grounding_context: dict[str, Any],
    conversation_history: list[dict[str, str]] | None,
    fallback_response: str,
) -> str:
    response = await _router.complete_text(
        workload=AIWorkload.STUDY_CHAT,
        messages=study_chat.build_messages(
            user_message=user_message,
            intent=intent,
            grounding_context=grounding_context,
            conversation_history=conversation_history,
        ),
        temperature=0.25,
        max_tokens=360,
    )
    if response is None:
        return fallback_response

    cleaned = normalize_plain_text(response.content, max_sentences=7, max_chars=1200)
    return cleaned or fallback_response


async def classify_scraped_questions(raw_texts: list[str]) -> list[dict[str, Any]]:
    semaphore = asyncio.Semaphore(3)

    async def classify_one(raw_text: str) -> dict[str, Any] | None:
        if not raw_text.strip():
            return None
        async with semaphore:
            result = await _router.complete_json(
                workload=AIWorkload.SCRAPER_STRUCTURING,
                messages=scraper_structuring.build_messages(raw_text),
                response_model=scraper_structuring.StructuredQuestionOutput,
                temperature=0.1,
                max_tokens=700,
            )
            if result is None:
                return None
            payload, _response = result
            return payload.model_dump()

    tasks = [classify_one(raw_text) for raw_text in raw_texts[:20]]
    resolved = await asyncio.gather(*tasks, return_exceptions=False)
    return [item for item in resolved if isinstance(item, dict)]


async def parse_syllabus(raw_text: str) -> dict[str, Any]:
    result = await _router.complete_json(
        workload=AIWorkload.SYLLABUS_PARSING,
        messages=syllabus_parsing.build_messages(raw_text),
        response_model=syllabus_parsing.SyllabusStructure,
        temperature=0.05,
        max_tokens=2200,
    )
    if result is None:
        return {"subjects": []}
    payload, _response = result
    return payload.model_dump()


async def generate_mcqs_from_study_material(
    raw_text: str,
    max_questions: int = 10,
) -> list[dict[str, Any]]:
    result = await _router.complete_json(
        workload=AIWorkload.MCQ_GENERATION,
        messages=mcq_generation.build_messages(raw_text, max_questions),
        response_model=mcq_generation.GeneratedMcqBatch,
        temperature=0.25,
        max_tokens=3200,
    )
    if result is None:
        return []
    payload, _response = result
    return [item.model_dump() for item in payload.questions[: max(1, min(12, int(max_questions or 10)))]]


async def generate_roadmap_month_enrichment(
    *,
    month_number: int,
    month_start_date: str,
    month_end_date: str,
    daily_study_minutes: int,
    weekly_input: list[dict[str, Any]],
) -> dict[str, Any] | None:
    profile = get_workload_profile(AIWorkload.ROADMAP_MONTH_ENRICHMENT)
    cache_key = _hash_cache_key(
        "roadmap_month",
        {
            "month_number": month_number,
            "month_start_date": month_start_date,
            "month_end_date": month_end_date,
            "daily_study_minutes": daily_study_minutes,
            "weekly_input": weekly_input,
        },
    )
    cached = _json_cache.get(cache_key)
    if cached:
        return cached

    result = await _router.complete_json(
        workload=AIWorkload.ROADMAP_MONTH_ENRICHMENT,
        messages=roadmap_enrichment.build_messages(
            month_number=month_number,
            month_start_date=month_start_date,
            month_end_date=month_end_date,
            daily_study_minutes=daily_study_minutes,
            weekly_input=weekly_input,
        ),
        response_model=roadmap_enrichment.RoadmapEnrichmentPayload,
        temperature=0.2,
        max_tokens=3200,
    )
    if result is None:
        return None
    payload, _response = result
    data = payload.model_dump()
    _json_cache.set(cache_key, data, profile.cache_ttl_seconds)
    return data
