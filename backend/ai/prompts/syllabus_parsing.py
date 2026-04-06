from __future__ import annotations

from pydantic import BaseModel

from ai.types import AIMessage


class SyllabusTopic(BaseModel):
    name: str
    subtopics: list[str]


class SyllabusSubject(BaseModel):
    name: str
    topics: list[SyllabusTopic]


class SyllabusStructure(BaseModel):
    subjects: list[SyllabusSubject]


def build_messages(raw_text: str) -> list[AIMessage]:
    return [
        AIMessage(
            role="system",
            content=(
                "You parse academic syllabus text into a subject-topic-subtopic hierarchy. "
                "Ignore administrative and logistical text. "
                "Return JSON only."
            ),
        ),
        AIMessage(
            role="user",
            content=(
                "Extract the subject, topic, and subtopic structure from this syllabus text.\n"
                "Rules:\n"
                "- Keep subtopics concise.\n"
                "- Group items under the nearest academic subject.\n"
                "- Exclude admin logistics, dates, and policy sections.\n\n"
                f"Syllabus text:\n{raw_text[:9000]}"
            ),
        ),
    ]
