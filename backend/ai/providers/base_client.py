from __future__ import annotations

import json
from typing import Any

import httpx

from ai.types import AIProviderError, AIProviderName, CompletionRequest, CompletionResponse, StructuredMode


class OpenAICompatibleClient:
    def __init__(
        self,
        *,
        provider_name: AIProviderName,
        api_key: str,
        base_url: str,
        extra_headers: dict[str, str] | None = None,
    ) -> None:
        self.provider_name = provider_name
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.extra_headers = extra_headers or {}

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def create_completion(self, request: CompletionRequest) -> CompletionResponse:
        if not self.is_configured:
            raise AIProviderError(f"{self.provider_name.value} is not configured")

        timeout = httpx.Timeout(
            timeout=request.timeout_seconds,
            connect=min(10.0, request.timeout_seconds),
        )

        payload = self._build_payload(request)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            **self.extra_headers,
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )

        if response.status_code >= 400:
            snippet = response.text[:400]
            raise AIProviderError(
                f"{self.provider_name.value} request failed with {response.status_code}: {snippet}"
            )

        try:
            data = response.json()
        except json.JSONDecodeError as exc:
            raise AIProviderError(
                f"{self.provider_name.value} returned invalid JSON"
            ) from exc

        if not isinstance(data, dict):
            raise AIProviderError(
                f"{self.provider_name.value} returned an unexpected response payload"
            )

        content = self._extract_message_content(data)
        if not content:
            raise AIProviderError(
                f"{self.provider_name.value} returned an empty completion response"
            )

        usage = data.get("usage")
        return CompletionResponse(
            content=content,
            provider=self.provider_name,
            model=request.model,
            usage=usage if isinstance(usage, dict) else {},
            raw=data,
        )

    def _build_payload(self, request: CompletionRequest) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": request.model,
            "messages": [
                {"role": item.role, "content": item.content}
                for item in request.messages
            ],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": False,
        }

        if request.response_schema and request.schema_name:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": request.schema_name,
                    "strict": request.structured_mode == StructuredMode.STRICT,
                    "schema": request.response_schema,
                },
            }

        return payload

    def _extract_message_content(self, payload: dict[str, Any]) -> str:
        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            return ""

        first_choice = choices[0] if isinstance(choices[0], dict) else {}
        message = first_choice.get("message")
        if not isinstance(message, dict):
            return ""

        content = message.get("content")
        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            text_parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    text_parts.append(item)
                    continue
                if not isinstance(item, dict):
                    continue
                if isinstance(item.get("text"), str):
                    text_parts.append(item["text"])
                    continue
                if item.get("type") == "text" and isinstance(item.get("content"), str):
                    text_parts.append(item["content"])
            return "\n".join(part.strip() for part in text_parts if part.strip()).strip()

        return ""
