from pydantic import BaseModel, Field

from schemas.quiz_schemas import QuestionOut


class PYQFilterSubject(BaseModel):
    id: str
    name: str


class PYQFilterTopic(BaseModel):
    id: str
    subject_id: str
    name: str


class PYQFilterOptionsResponse(BaseModel):
    years: list[int] = Field(default_factory=list)
    subjects: list[PYQFilterSubject] = Field(default_factory=list)
    topics: list[PYQFilterTopic] = Field(default_factory=list)
    difficulties: list[str] = Field(default_factory=list)


class PYQBrowseItem(BaseModel):
    id: str
    subject_id: str
    subject_name: str
    topic_id: str
    topic_name: str
    subtopic: str | None = None
    difficulty: str
    year: int | None = None
    source_url: str | None = None
    question_text: str
    options: list[str] = Field(default_factory=list)
    question_image_urls: list[str] = Field(default_factory=list)
    correct_answer: str | None = None
    explanation: str | None = None
    marks: int = Field(default=1)


class PYQBrowsePagination(BaseModel):
    page: int = Field(default=1)
    page_size: int = Field(default=20)
    has_more: bool = Field(default=False)


class PYQBrowseResponse(BaseModel):
    total: int
    limit: int
    offset: int
    questions: list[PYQBrowseItem] = Field(default_factory=list)
    applied_filters: dict = Field(default_factory=dict)
    pagination: PYQBrowsePagination = Field(default_factory=PYQBrowsePagination)


class StartPYQPracticeRequest(BaseModel):
    subject_id: str | None = None
    topic_id: str | None = None
    difficulty: str | None = None
    year_from: int | None = Field(default=None, ge=1991, le=2100)
    year_to: int | None = Field(default=None, ge=1991, le=2100)
    search: str | None = None
    question_limit: int = Field(default=20, ge=1, le=50)


class PYQPracticeResponse(BaseModel):
    total: int
    requested_count: int = Field(default=0)
    questions: list[QuestionOut] = Field(default_factory=list)
    context_payload: dict = Field(default_factory=dict)
    selection_summary: dict = Field(default_factory=dict)
