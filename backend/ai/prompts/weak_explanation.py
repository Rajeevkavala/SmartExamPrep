from __future__ import annotations

from ai.types import AIMessage
from ml.nlp_pipeline import build_weakness_prompt


def build_messages(
    *,
    topic_name: str,
    subject_name: str,
    weakness_score: float,
    accuracy: float,
    repeated_mistakes: int,
    avg_response_time_s: float,
) -> list[AIMessage]:
    return [
        AIMessage(
            role="system",
            content=(
                "You are SmartExamPrep's exam coach. "
                "Write concise, grounded, student-friendly feedback using only the provided stats."
            ),
        ),
        AIMessage(
            role="user",
            content=build_weakness_prompt(
                topic_name=topic_name,
                subject_name=subject_name,
                weakness_score=weakness_score,
                accuracy=accuracy,
                repeated_mistakes=repeated_mistakes,
                avg_response_time_s=avg_response_time_s,
            ),
        ),
    ]
