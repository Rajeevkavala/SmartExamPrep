from __future__ import annotations

from ai.models.model_registry import WORKLOAD_PROFILES
from ai.types import AIWorkload, WorkloadProfile


def get_workload_profile(workload: AIWorkload) -> WorkloadProfile:
    return WORKLOAD_PROFILES[workload]
