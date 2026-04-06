from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from ai.types import AIMessage


class StructuredQuestionOutput(BaseModel):
    question_text: str
    question_image_urls: list[str]
    options: list[str]
    correct_answer: str
    explanation: str
    subject: str
    topic: str
    subtopic: str
    difficulty: Literal["easy", "medium", "hard"]
    year: int | None
    source_type: Literal["PYQ", "practice"]


def build_messages(raw_text: str) -> list[AIMessage]:
    return [
        AIMessage(
            role="system",
            content=(
                "You are a GATE CSE question extraction assistant. "
                "Extract one clean multiple-choice question from noisy scraped content. "
                "Return JSON only and do not fabricate missing fields when the text does not support them."
            ),
        ),
        AIMessage(
            role="user",
            content=(
                "Extract the question, options, correct answer, explanation, and the most likely GATE CSE classification.\n"
                "Question text may include nearby image URLs. Preserve them in `question_image_urls` when present.\n\n"
                f"Raw text:\n{raw_text[:1800]}"
            ),
        ),
    ]
