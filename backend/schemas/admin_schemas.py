from pydantic import BaseModel


class SubjectCreate(BaseModel):
    name: str
    description: str | None = None
    display_order: int = 0


class SubjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    display_order: int | None = None


class TopicCreate(BaseModel):
    name: str
    subtopics: list[str] = []
    nlp_keyword_tags: list[str] = []
    display_order: int = 0
    difficulty_weight: float = 1.0


class TopicUpdate(BaseModel):
    name: str | None = None
    subtopics: list[str] | None = None
    nlp_keyword_tags: list[str] | None = None
    difficulty_weight: float | None = None


class QuestionCreate(BaseModel):
    subject_id: str
    topic_id: str
    subtopic: str | None = None
    question_text: str
    options: list[str]
    question_image_urls: list[str] = []
    correct_answer: str
    explanation: str | None = None
    difficulty: str
    source_type: str = "practice"
    source_url: str | None = None
    year: int | None = None


class QuestionUpdate(BaseModel):
    subtopic: str | None = None
    question_text: str | None = None
    options: list[str] | None = None
    question_image_urls: list[str] | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    difficulty: str | None = None
    source_type: str | None = None
    year: int | None = None
    is_verified: bool | None = None


class BulkVerifyRequest(BaseModel):
    question_ids: list[str]
