from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from ai.types import AIMessage


class GeneratedMcq(BaseModel):
    question_text: str
    options: list[str]
    correct_answer: str
    explanation: str
    subject_name: str
    topic_name: str
    difficulty: Literal["easy", "medium", "hard"]


class GeneratedMcqBatch(BaseModel):
    questions: list[GeneratedMcq]


def build_messages(raw_text: str, max_questions: int) -> list[AIMessage]:
    bounded_max = max(1, min(12, int(max_questions or 10)))
    return [
        AIMessage(
            role="system",
            content=(
                "You are an exam-content author for computer science entrance exams. "
                "Create only answerable MCQs based on the supplied material. "
                "Return JSON only."
            ),
        ),
        AIMessage(
            role="user",
            content=(
                f"Convert the study material into exactly {bounded_max} multiple-choice questions.\n"
                "Rules:\n"
                "- Every question must be answerable from the provided material.\n"
                "- Use exactly 4 options per question.\n"
                "- Keep explanations short and grounded.\n"
                "- Use plain text only.\n\n"
                f"Study material:\n{raw_text[:12000]}"
            ),
        ),
    ]
