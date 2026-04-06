from __future__ import annotations

from collections.abc import Iterable

from ai.types import AIProviderName, AIWorkload, RouteTarget, StructuredMode, WorkloadProfile


WORKLOAD_PROFILES: dict[AIWorkload, WorkloadProfile] = {
    AIWorkload.WEAKNESS_EXPLANATION: WorkloadProfile(
        workload=AIWorkload.WEAKNESS_EXPLANATION,
        should_use_llm=True,
        workload_type="personalized coaching",
        trust_level="low_trust_output_only",
        latency_sensitivity="medium",
        cost_sensitivity="high",
        model_strength_needed="fast low-cost instruction model",
        execution_mode="real_time_cached",
        cache_ttl_seconds=6 * 60 * 60,
        routes=(
            RouteTarget(
                provider=AIProviderName.GROQ,
                model="llama-3.1-8b-instant",
                timeout_seconds=6.0,
                max_retries=2,
            ),
        ),
    ),
    AIWorkload.DASHBOARD_FOCUS_HINT: WorkloadProfile(
        workload=AIWorkload.DASHBOARD_FOCUS_HINT,
        should_use_llm=True,
        workload_type="short coaching hint",
        trust_level="low_trust_output_only",
        latency_sensitivity="high",
        cost_sensitivity="high",
        model_strength_needed="very fast concise model",
        execution_mode="real_time_cached",
        cache_ttl_seconds=30 * 60,
        routes=(
            RouteTarget(
                provider=AIProviderName.GROQ,
                model="llama-3.1-8b-instant",
                timeout_seconds=4.0,
                max_retries=2,
            ),
        ),
    ),
    AIWorkload.STUDY_CHAT: WorkloadProfile(
        workload=AIWorkload.STUDY_CHAT,
        should_use_llm=True,
        workload_type="grounded tutoring chat",
        trust_level="medium_trust_grounded_only",
        latency_sensitivity="high",
        cost_sensitivity="medium",
        model_strength_needed="strong grounded reasoning chat model",
        execution_mode="real_time",
        cache_ttl_seconds=0,
        routes=(
            RouteTarget(
                provider=AIProviderName.GROQ,
                model="llama-3.3-70b-versatile",
                timeout_seconds=10.0,
                max_retries=2,
            ),
        ),
    ),
    AIWorkload.ROADMAP_MONTH_ENRICHMENT: WorkloadProfile(
        workload=AIWorkload.ROADMAP_MONTH_ENRICHMENT,
        should_use_llm=True,
        workload_type="non-critical roadmap enrichment",
        trust_level="assist_only_non_critical",
        latency_sensitivity="low",
        cost_sensitivity="high",
        model_strength_needed="strong planner-style structured model",
        execution_mode="async_batch_like",
        cache_ttl_seconds=24 * 60 * 60,
        routes=(
            RouteTarget(
                provider=AIProviderName.GROQ,
                model="llama-3.3-70b-versatile",
                timeout_seconds=14.0,
                max_retries=2,
                structured_mode=StructuredMode.STRICT,
            ),
        ),
    ),
    AIWorkload.SCRAPER_STRUCTURING: WorkloadProfile(
        workload=AIWorkload.SCRAPER_STRUCTURING,
        should_use_llm=True,
        workload_type="structured extraction",
        trust_level="medium_trust_human_review_required",
        latency_sensitivity="medium",
        cost_sensitivity="medium",
        model_strength_needed="schema-reliable extraction model",
        execution_mode="async_batch_like",
        cache_ttl_seconds=0,
        routes=(
            RouteTarget(
                provider=AIProviderName.GROQ,
                model="llama-3.3-70b-versatile",
                timeout_seconds=10.0,
                max_retries=2,
                structured_mode=StructuredMode.STRICT,
            ),
        ),
    ),
    AIWorkload.SYLLABUS_PARSING: WorkloadProfile(
        workload=AIWorkload.SYLLABUS_PARSING,
        should_use_llm=True,
        workload_type="hierarchical syllabus extraction",
        trust_level="medium_trust_admin_review_required",
        latency_sensitivity="low",
        cost_sensitivity="medium",
        model_strength_needed="schema-reliable extraction model",
        execution_mode="async_batch_like",
        cache_ttl_seconds=0,
        routes=(
            RouteTarget(
                provider=AIProviderName.GROQ,
                model="llama-3.3-70b-versatile",
                timeout_seconds=12.0,
                max_retries=2,
                structured_mode=StructuredMode.STRICT,
            ),
        ),
    ),
    AIWorkload.MCQ_GENERATION: WorkloadProfile(
        workload=AIWorkload.MCQ_GENERATION,
        should_use_llm=True,
        workload_type="content transformation to MCQs",
        trust_level="medium_trust_student_review_required",
        latency_sensitivity="low",
        cost_sensitivity="medium",
        model_strength_needed="strong long-context structured generation model",
        execution_mode="async_batch_like",
        cache_ttl_seconds=0,
        routes=(
            RouteTarget(
                provider=AIProviderName.GROQ,
                model="llama-3.3-70b-versatile",
                timeout_seconds=16.0,
                max_retries=2,
                structured_mode=StructuredMode.STRICT,
            ),
        ),
    ),
}


def iter_workload_routes() -> Iterable[tuple[AIWorkload, RouteTarget]]:
    for workload, profile in WORKLOAD_PROFILES.items():
        for route in profile.routes:
            yield workload, route
