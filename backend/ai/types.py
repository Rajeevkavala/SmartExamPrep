from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class AIProviderName(str, Enum):
    GROQ = "groq"


class AIWorkload(str, Enum):
    WEAKNESS_EXPLANATION = "weakness_explanation"
    DASHBOARD_FOCUS_HINT = "dashboard_focus_hint"
    STUDY_CHAT = "study_chat"
    ROADMAP_MONTH_ENRICHMENT = "roadmap_month_enrichment"
    SCRAPER_STRUCTURING = "scraper_structuring"
    SYLLABUS_PARSING = "syllabus_parsing"
    MCQ_GENERATION = "mcq_generation"


class StructuredMode(str, Enum):
    NONE = "none"
    STRICT = "strict"
    BEST_EFFORT = "best_effort"


@dataclass(frozen=True)
class AIMessage:
    role: str
    content: str


@dataclass(frozen=True)
class RouteTarget:
    provider: AIProviderName
    model: str
    timeout_seconds: float
    max_retries: int = 1
    structured_mode: StructuredMode = StructuredMode.NONE
    allow_response_healing: bool = False


@dataclass(frozen=True)
class WorkloadProfile:
    workload: AIWorkload
    should_use_llm: bool
    workload_type: str
    trust_level: str
    latency_sensitivity: str
    cost_sensitivity: str
    model_strength_needed: str
    execution_mode: str
    cache_ttl_seconds: int
    routes: tuple[RouteTarget, ...]


@dataclass(frozen=True)
class CompletionRequest:
    model: str
    messages: list[AIMessage]
    temperature: float
    max_tokens: int
    timeout_seconds: float
    response_schema: dict[str, Any] | None = None
    schema_name: str | None = None
    structured_mode: StructuredMode = StructuredMode.NONE
    allow_response_healing: bool = False


@dataclass
class CompletionResponse:
    content: str
    provider: AIProviderName
    model: str
    usage: dict[str, Any] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)


class AIProviderError(RuntimeError):
    pass


class AIResponseValidationError(RuntimeError):
    pass
