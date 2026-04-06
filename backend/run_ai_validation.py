from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock

BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(BACKEND_DIR))

from ml.adaptive_recommender import AdaptiveRecommender
from ml.spaced_revision import RevisionInput, SpacedRevisionScheduler
from ml.weakness_detector import WeaknessDetector, WeaknessFeatures
from ai.services.ai_router import AIRouter
from ai.types import AIMessage, AIProviderName, AIWorkload, CompletionResponse
from services import ai_service


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_weakness_checks() -> None:
    detector = WeaknessDetector(use_ml_model=False)
    strong = detector.compute(
        WeaknessFeatures(
            accuracy=0.88,
            repeated_mistakes=0,
            avg_response_time_zscore=-0.2,
            recent_performance_slope=0.1,
            difficulty_sensitivity=0.1,
        )
    )
    weak = detector.compute(
        WeaknessFeatures(
            accuracy=0.05,
            repeated_mistakes=10,
            avg_response_time_zscore=3.0,
            recent_performance_slope=-1.0,
            difficulty_sensitivity=1.0,
        )
    )

    assert_true(
        weak["weakness_score"] > strong["weakness_score"],
        "Weak profile should produce a higher weakness score than strong profile.",
    )
    assert_true(
        weak["mastery_level"] == "Weak",
        "Weak profile should map to Weak mastery.",
    )


def run_revision_checks() -> None:
    scheduler = SpacedRevisionScheduler()
    poor = scheduler.schedule(
        RevisionInput("topic-1", 35, 1, 2.5, 0, 1.0)
    )
    excellent = scheduler.schedule(
        RevisionInput("topic-2", 90, 7, 2.5, 3, 1.0)
    )

    assert_true(
        poor["interval_days"] <= excellent["interval_days"],
        "Excellent performance should not produce a shorter interval than poor performance.",
    )
    assert_true(
        excellent["ease_factor"] >= poor["ease_factor"],
        "Ease factor should improve for excellent scores.",
    )


def run_recommendation_checks() -> None:
    recommender = AdaptiveRecommender()
    selected = recommender.recommend(
        topic_masteries=[
            {
                "topic_id": "weak-topic",
                "topic_name": "Weak Topic",
                "weakness_score": 78,
                "last_attempted_at": None,
            },
            {
                "topic_id": "medium-topic",
                "topic_name": "Medium Topic",
                "weakness_score": 52,
                "last_attempted_at": None,
            },
            {
                "topic_id": "strong-topic",
                "topic_name": "Strong Topic",
                "weakness_score": 18,
                "last_attempted_at": None,
            },
        ],
        recent_embeddings=[[0.99, 0.01]],
        candidates=[
            {
                "id": "q-1",
                "topic_id": "weak-topic",
                "difficulty": "easy",
                "question_text": "q1",
                "embedding": [0.1, 0.9],
                "last_attempted_at": None,
            },
            {
                "id": "q-2",
                "topic_id": "weak-topic",
                "difficulty": "medium",
                "question_text": "q2",
                "embedding": [0.2, 0.8],
                "last_attempted_at": None,
            },
            {
                "id": "q-3",
                "topic_id": "medium-topic",
                "difficulty": "medium",
                "question_text": "q3",
                "embedding": [0.3, 0.7],
                "last_attempted_at": None,
            },
            {
                "id": "q-4",
                "topic_id": "strong-topic",
                "difficulty": "hard",
                "question_text": "q4",
                "embedding": [0.4, 0.6],
                "last_attempted_at": None,
            },
            {
                "id": "q-dup",
                "topic_id": "weak-topic",
                "difficulty": "hard",
                "question_text": "dup",
                "embedding": [0.99, 0.01],
                "last_attempted_at": None,
            },
        ],
        daily_study_minutes=30,
    )

    selected_topic_ids = [item["topic_id"] for item in selected]
    assert_true(
        "weak-topic" in selected_topic_ids,
        "Recommendations should include the weak topic.",
    )
    assert_true(
        "q-dup" not in [item["id"] for item in selected],
        "Near-duplicate candidates should be filtered out.",
    )


def run_recommendation_null_safety_checks() -> None:
    recommender = AdaptiveRecommender()
    selected = recommender.recommend(
        topic_masteries=[
            {
                "topic_id": "nullable-topic",
                "topic_name": "Nullable Topic",
                "weakness_score": None,
                "last_attempted_at": None,
            },
            {
                "topic_id": "string-topic",
                "topic_name": "String Topic",
                "weakness_score": "86",
                "last_attempted_at": None,
            },
            {
                "topic_id": "nan-topic",
                "topic_name": "NaN Topic",
                "weakness_score": float("nan"),
                "last_attempted_at": None,
            },
        ],
        recent_embeddings=[],
        candidates=[
            {
                "id": "nullable-q",
                "topic_id": "nullable-topic",
                "difficulty": "easy",
                "question_text": "nullable",
                "embedding": [0.2, 0.8],
                "last_attempted_at": None,
            },
            {
                "id": "string-q",
                "topic_id": "string-topic",
                "difficulty": "medium",
                "question_text": "string",
                "embedding": [0.3, 0.7],
                "last_attempted_at": None,
            },
            {
                "id": "nan-q",
                "topic_id": "nan-topic",
                "difficulty": "hard",
                "question_text": "nan",
                "embedding": [0.4, 0.6],
                "last_attempted_at": None,
            },
        ],
        daily_study_minutes=30,
    )
    assert_true(
        isinstance(selected, list),
        "Adaptive recommender should handle null/string/NaN weakness_score safely.",
    )


async def run_ai_router_smoke_check() -> None:
    router = AIRouter()
    mock_groq = AsyncMock()
    mock_groq.is_configured = True
    mock_groq.create_completion = AsyncMock(
        return_value=CompletionResponse(
            content="Smoke test response",
            provider=AIProviderName.GROQ,
            model="llama-3.1-8b-instant",
        )
    )
    router._providers = {AIProviderName.GROQ: mock_groq}

    result = await router.complete_text(
        workload=AIWorkload.DASHBOARD_FOCUS_HINT,
        messages=[AIMessage(role="user", content="Run router smoke test")],
        temperature=0.1,
        max_tokens=32,
    )
    assert_true(result is not None, "AI router smoke call returned no response.")
    assert_true(
        bool(result and result.content.strip()),
        "AI router smoke call returned empty content.",
    )


async def run_ai_fallback_check() -> None:
    explanation = await ai_service.generate_weakness_explanation(
        topic_name="CPU Scheduling",
        subject_name="Operating Systems",
        weakness_score=72,
        accuracy=0.31,
        repeated_mistakes=3,
        avg_response_time_s=42,
        user_id="demo-user",
        topic_id="demo-topic",
    )

    assert_true(
        isinstance(explanation, str) and len(explanation.strip()) > 0,
        "AI fallback explanation should return non-empty text.",
    )


async def run_chat_fallback_check() -> None:
    reply = await ai_service.generate_study_chat_reply(
        user_message="What should I study today?",
        intent="planner_help",
        grounding_context={
            "planner": {
                "status": "active",
                "pending_tasks": [{"title": "Revise Deadlocks"}],
            },
            "weak_topics": [{"topic_name": "CPU Scheduling"}],
        },
        conversation_history=[
            {"role": "user", "message": "I am confused about my plan."}
        ],
        fallback_response="Start with your first pending planner task and then do one adaptive quiz block.",
    )

    assert_true(
        isinstance(reply, str) and len(reply.strip()) > 0,
        "AI fallback chat reply should return non-empty text.",
    )


def main() -> None:
    run_weakness_checks()
    run_revision_checks()
    run_recommendation_checks()
    run_recommendation_null_safety_checks()
    asyncio.run(run_ai_router_smoke_check())
    asyncio.run(run_ai_fallback_check())
    asyncio.run(run_chat_fallback_check())
    print("AI validation harness passed.")


if __name__ == "__main__":
    main()
