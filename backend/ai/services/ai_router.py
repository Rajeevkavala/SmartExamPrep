from __future__ import annotations

import logging
from typing import TypeVar

from pydantic import BaseModel

from ai.models.routing_policy import get_workload_profile
from ai.providers import GroqClient
from ai.types import AIProviderName, AIWorkload, CompletionRequest, CompletionResponse
from ai.validators.json_validator import build_response_schema, parse_and_validate_json


logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


class AIRouter:
    def __init__(self) -> None:
        self._providers = {
            AIProviderName.GROQ: GroqClient(),
        }

    def provider_status(self) -> dict[str, bool]:
        return {
            provider.value: client.is_configured
            for provider, client in self._providers.items()
        }

    async def complete_text(
        self,
        *,
        workload: AIWorkload,
        messages,
        temperature: float,
        max_tokens: int,
    ) -> CompletionResponse | None:
        profile = get_workload_profile(workload)
        last_error: Exception | None = None

        for route in profile.routes:
            client = self._providers.get(route.provider)
            if client is None:
                logger.warning(
                    "No AI client configured for provider '%s' (workload=%s)",
                    route.provider.value,
                    workload.value,
                )
                continue
            if not client.is_configured:
                continue

            for attempt in range(1, route.max_retries + 1):
                try:
                    return await client.create_completion(
                        CompletionRequest(
                            model=route.model,
                            messages=list(messages),
                            temperature=temperature,
                            max_tokens=max_tokens,
                            timeout_seconds=route.timeout_seconds,
                        )
                    )
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "AI text attempt failed for %s via %s/%s (attempt %s/%s): %s",
                        workload.value,
                        route.provider.value,
                        route.model,
                        attempt,
                        route.max_retries,
                        exc,
                    )

        if last_error:
            logger.warning("All AI text routes failed for %s: %s", workload.value, last_error)
        return None

    async def complete_json(
        self,
        *,
        workload: AIWorkload,
        messages,
        response_model: type[T],
        temperature: float,
        max_tokens: int,
    ) -> tuple[T, CompletionResponse] | None:
        profile = get_workload_profile(workload)
        schema = build_response_schema(response_model)
        last_error: Exception | None = None

        for route in profile.routes:
            client = self._providers.get(route.provider)
            if client is None:
                logger.warning(
                    "No AI client configured for provider '%s' (workload=%s)",
                    route.provider.value,
                    workload.value,
                )
                continue
            if not client.is_configured:
                continue

            for attempt in range(1, route.max_retries + 1):
                try:
                    response = await client.create_completion(
                        CompletionRequest(
                            model=route.model,
                            messages=list(messages),
                            temperature=temperature,
                            max_tokens=max_tokens,
                            timeout_seconds=route.timeout_seconds,
                            response_schema=schema,
                            schema_name=f"{workload.value}_response",
                            structured_mode=route.structured_mode,
                            allow_response_healing=route.allow_response_healing,
                        )
                    )
                    validated = parse_and_validate_json(response.content, response_model)
                    return validated, response
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "AI JSON attempt failed for %s via %s/%s (attempt %s/%s): %s",
                        workload.value,
                        route.provider.value,
                        route.model,
                        attempt,
                        route.max_retries,
                        exc,
                    )

        if last_error:
            logger.warning("All AI JSON routes failed for %s: %s", workload.value, last_error)
        return None
