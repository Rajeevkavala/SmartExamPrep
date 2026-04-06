import os
import unittest
from typing import Any, cast
from unittest.mock import AsyncMock


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-ai-router-smoke.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from ai.services.ai_router import AIRouter
from ai.types import AIMessage, AIProviderName, AIWorkload, CompletionResponse


class AIRouterSmokeTests(unittest.IsolatedAsyncioTestCase):
    async def test_complete_text_route_executes_without_attribute_errors(self) -> None:
        router = AIRouter()

        mock_groq_client = cast(Any, AsyncMock())
        mock_groq_client.is_configured = True
        mock_groq_client.create_completion = AsyncMock(
            return_value=CompletionResponse(
                content="Focus on CPU scheduling first.",
                provider=AIProviderName.GROQ,
                model="llama-3.1-8b-instant",
            )
        )
        router._providers = {AIProviderName.GROQ: mock_groq_client}

        result = await router.complete_text(
            workload=AIWorkload.DASHBOARD_FOCUS_HINT,
            messages=[AIMessage(role="user", content="Give one focus hint")],
            temperature=0.1,
            max_tokens=64,
        )

        self.assertIsNotNone(result)
        if result is None:
            self.fail("Expected a completion response from mocked provider.")

        self.assertEqual(result.provider, AIProviderName.GROQ)
        self.assertTrue(result.content.strip())
        mock_groq_client.create_completion.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
