from pydantic import AnyHttpUrl, BaseModel, Field, TypeAdapter, field_validator


MAX_QUESTION_IMAGE_URLS = 6
_http_url_adapter = TypeAdapter(AnyHttpUrl)


def _normalize_question_image_urls(raw_urls: list[str]) -> list[str]:
    normalized_urls: list[str] = []
    seen_urls: set[str] = set()

    for raw_url in raw_urls:
        if not isinstance(raw_url, str):
            raise ValueError("question_image_urls must contain only strings")

        cleaned_url = raw_url.strip()
        if not cleaned_url:
            continue

        validated_url = str(_http_url_adapter.validate_python(cleaned_url))
        if validated_url in seen_urls:
            continue

        seen_urls.add(validated_url)
        normalized_urls.append(validated_url)

    if len(normalized_urls) > MAX_QUESTION_IMAGE_URLS:
        raise ValueError(
            f"At most {MAX_QUESTION_IMAGE_URLS} question image URLs are allowed"
        )

    return normalized_urls


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255, example="Operating Systems")
    description: str | None = Field(default=None, example="Core concepts of OS design")
    display_order: int = Field(default=0, ge=0, example=2)

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Operating Systems",
                "description": "Core concepts of OS design",
                "display_order": 2,
            }
        }
    }


class SubjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255, example="Computer Networks")
    description: str | None = Field(default=None, example="Updated description")
    display_order: int | None = Field(default=None, ge=0, example=3)

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Computer Networks",
                "description": "Updated description",
                "display_order": 3,
            }
        }
    }


class TopicCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255, example="CPU Scheduling")
    subtopics: list[str] = Field(default_factory=list, example=["FCFS", "SJF", "Round Robin"])
    nlp_keyword_tags: list[str] = Field(default_factory=list, example=["scheduling", "throughput", "turnaround time"])
    display_order: int = Field(default=0, ge=0, example=1)
    difficulty_weight: float = Field(default=1.0, ge=0.5, le=2.0, example=1.2)

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "CPU Scheduling",
                "subtopics": ["FCFS", "SJF", "Round Robin"],
                "nlp_keyword_tags": ["scheduling", "throughput", "turnaround time"],
                "display_order": 1,
                "difficulty_weight": 1.2,
            }
        }
    }


class TopicUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255, example="Memory Management")
    subtopics: list[str] | None = Field(default=None, example=["Paging", "Segmentation"])
    nlp_keyword_tags: list[str] | None = Field(default=None, example=["paging", "tlb", "virtual memory"])
    display_order: int | None = Field(default=None, ge=0, example=2)
    difficulty_weight: float | None = Field(default=None, ge=0.5, le=2.0, example=1.4)

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Memory Management",
                "subtopics": ["Paging", "Segmentation"],
                "nlp_keyword_tags": ["paging", "tlb", "virtual memory"],
                "display_order": 2,
                "difficulty_weight": 1.4,
            }
        }
    }


class QuestionCreate(BaseModel):
    subject_id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    topic_id: str = Field(example="e636dc53-0e6d-4f69-a367-7198d5a7e3c8")
    subtopic: str | None = Field(default=None, example="Round Robin")
    question_text: str = Field(min_length=10, example="Which scheduling algorithm gives equal CPU time slices to all processes?")
    options: list[str] = Field(
        min_length=4,
        max_length=4,
        example=[
            "A. FCFS",
            "B. Round Robin",
            "C. Priority Scheduling",
            "D. SJF",
        ],
    )
    question_image_urls: list[str] = Field(default_factory=list, example=["https://example.com/pyq/cpu-scheduling-q1.png"])
    correct_answer: str = Field(min_length=1, max_length=2, example="B")
    explanation: str | None = Field(default=None, example="Round Robin allocates a fixed time quantum to each process in cyclic order.")
    difficulty: str = Field(example="medium")
    source_type: str = Field(default="practice", example="PYQ")
    source_url: str | None = Field(default=None, example="https://gateoverflow.in/example-question")
    year: int | None = Field(default=None, ge=1991, le=2100, example=2021)

    model_config = {
        "json_schema_extra": {
            "example": {
                "subject_id": "3f54d88f-6342-421b-b2f8-2755ee9f66c7",
                "topic_id": "e636dc53-0e6d-4f69-a367-7198d5a7e3c8",
                "subtopic": "Round Robin",
                "question_text": "Which scheduling algorithm gives equal CPU time slices to all processes?",
                "options": [
                    "A. FCFS",
                    "B. Round Robin",
                    "C. Priority Scheduling",
                    "D. SJF",
                ],
                "question_image_urls": ["https://example.com/pyq/cpu-scheduling-q1.png"],
                "correct_answer": "B",
                "explanation": "Round Robin allocates a fixed time quantum to each process in cyclic order.",
                "difficulty": "medium",
                "source_type": "PYQ",
                "source_url": "https://gateoverflow.in/example-question",
                "year": 2021,
            }
        }
    }

    @field_validator("question_image_urls", mode="before")
    @classmethod
    def validate_question_image_urls(cls, value: object) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("question_image_urls must be a list")
        return _normalize_question_image_urls(value)


class QuestionUpdate(BaseModel):
    subject_id: str | None = Field(default=None, example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    topic_id: str | None = Field(default=None, example="e636dc53-0e6d-4f69-a367-7198d5a7e3c8")
    subtopic: str | None = Field(default=None, example="Priority Scheduling")
    question_text: str | None = Field(default=None, min_length=10, example="Updated question statement")
    options: list[str] | None = Field(default=None, min_length=4, max_length=4, example=["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"])
    question_image_urls: list[str] | None = Field(default=None, example=["https://example.com/pyq/updated-image.png"])
    correct_answer: str | None = Field(default=None, min_length=1, max_length=2, example="C")
    explanation: str | None = Field(default=None, example="Updated explanation text")
    difficulty: str | None = Field(default=None, example="hard")
    source_type: str | None = Field(default=None, example="scraped")
    source_url: str | None = Field(default=None, example="https://gateoverflow.in/updated-example-question")
    year: int | None = Field(default=None, ge=1991, le=2100, example=2023)
    is_verified: bool | None = Field(default=None, example=True)

    model_config = {
        "json_schema_extra": {
            "example": {
                "subject_id": "3f54d88f-6342-421b-b2f8-2755ee9f66c7",
                "topic_id": "e636dc53-0e6d-4f69-a367-7198d5a7e3c8",
                "question_text": "Updated question statement",
                "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
                "correct_answer": "C",
                "difficulty": "hard",
                "is_verified": True,
            }
        }
    }

    @field_validator("question_image_urls", mode="before")
    @classmethod
    def validate_question_image_urls(cls, value: object) -> list[str] | None:
        if value is None:
            return None
        if not isinstance(value, list):
            raise ValueError("question_image_urls must be a list")
        return _normalize_question_image_urls(value)


class BulkVerifyRequest(BaseModel):
    question_ids: list[str] = Field(
        min_length=1,
        example=[
            "f4afef24-1a5b-47da-b688-f6646f3ed198",
            "f7c86f35-cf5c-47b7-bb8f-943fd53f3f3c",
        ],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "question_ids": [
                    "f4afef24-1a5b-47da-b688-f6646f3ed198",
                    "f7c86f35-cf5c-47b7-bb8f-943fd53f3f3c",
                ]
            }
        }
    }
