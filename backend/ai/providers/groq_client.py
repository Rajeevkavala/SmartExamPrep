from __future__ import annotations

from config import settings
from ai.providers.base_client import OpenAICompatibleClient
from ai.types import AIProviderName


class GroqClient(OpenAICompatibleClient):
    def __init__(self) -> None:
        super().__init__(
            provider_name=AIProviderName.GROQ,
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL,
        )
