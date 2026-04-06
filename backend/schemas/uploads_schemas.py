from pydantic import BaseModel, Field


class GeneratedUploadQuestion(BaseModel):
    question_id: str = Field(example="q_1")
    question_text: str = Field(example="Which scheduling algorithm can cause starvation?")
    options: list[str] = Field(
        default_factory=list,
        example=[
            "A. FCFS",
            "B. Round Robin",
            "C. Priority Scheduling",
            "D. Multilevel Queue",
        ],
    )
    correct_answer: str | None = Field(default=None, example="C")
    explanation: str | None = Field(
        default=None,
        example="Priority scheduling may starve low-priority processes without aging.",
    )
    subject_name: str | None = Field(default=None, example="Operating Systems")
    topic_name: str | None = Field(default=None, example="CPU Scheduling")
    difficulty: str | None = Field(default=None, example="medium")


class StudentUploadSummaryResponse(BaseModel):
    upload_id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    exam_id: str | None = Field(default=None, example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    filename: str = Field(example="os-notes.pdf")
    file_size_bytes: int = Field(default=0, example=438122)
    status: str = Field(example="done")
    processing_mode: str = Field(example="ai_generated")
    question_count: int = Field(default=0, example=12)
    extracted_text_preview: str | None = Field(default=None, example="Unit 4: CPU Scheduling...")
    error_message: str | None = Field(default=None, example=None)
    created_at: str = Field(example="2026-04-05T12:00:00")
    updated_at: str = Field(example="2026-04-05T12:01:10")


class StudentUploadDetailResponse(StudentUploadSummaryResponse):
    questions: list[GeneratedUploadQuestion] = Field(default_factory=list)

