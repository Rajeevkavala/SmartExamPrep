from pydantic import BaseModel, Field, HttpUrl


class ScrapeStartRequest(BaseModel):
    url: HttpUrl = Field(example="https://example.com/gate-cse-questions")
    notes: str | None = Field(default=None, example="OS PYQ scrape run")

    model_config = {
        "json_schema_extra": {
            "example": {
                "url": "https://example.com/gate-cse-questions",
                "notes": "OS PYQ scrape run",
            }
        }
    }


class ScrapeJobResponse(BaseModel):
    job_id: str
    url: str
    status: str
    notes: str | None
    extracted_questions: list[dict]
    questions_imported: int
    error_message: str | None
    created_at: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "6dca0464-df30-4b03-8a2f-8618f93318f5",
                "url": "https://example.com/gate-cse-questions",
                "status": "done",
                "notes": "OS PYQ scrape run",
                "extracted_questions": [
                    {
                        "question_text": "Which scheduling algorithm can cause starvation?",
                        "question_image_urls": ["https://example.com/pyq/image-1.png"],
                        "options": [
                            "A. FCFS",
                            "B. Round Robin",
                            "C. Priority Scheduling",
                            "D. SJF",
                        ],
                        "correct_answer": "C",
                        "subject": "Operating Systems",
                        "topic": "CPU Scheduling",
                        "subtopic": "Priority Scheduling",
                        "difficulty": "medium",
                        "year": 2019,
                        "source_type": "PYQ",
                    }
                ],
                "questions_imported": 3,
                "error_message": None,
                "created_at": "2026-04-03T12:00:00",
            }
        }
    }


class ImportJobRequest(BaseModel):
    accepted_indices: list[int]

    model_config = {
        "json_schema_extra": {
            "example": {
                "accepted_indices": [0, 2, 4]
            }
        }
    }
