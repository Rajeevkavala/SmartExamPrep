from pydantic import BaseModel, Field


class ExamCatalogItem(BaseModel):
    exam_id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    code: str = Field(example="gate-cse")
    title: str = Field(example="GATE Computer Science")
    category: str = Field(example="Engineering")
    description: str | None = Field(
        default=None,
        example="Practice the full GATE CSE loop with roadmap, predictor, and mock tests.",
    )
    subject_count: int = Field(default=0, example=12)
    topic_count: int = Field(default=0, example=68)
    pyq_count: int = Field(default=0, example=540)
    enrolled_count: int = Field(default=0, example=128)
    last_updated_at: str | None = Field(default=None, example="2026-04-07T14:20:00")
    recommended_for: str | None = Field(default=None, example="Students preparing for full-length technical entrance exams with PYQ-heavy patterns.")
    capabilities: dict = Field(default_factory=dict)
