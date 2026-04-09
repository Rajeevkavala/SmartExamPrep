from pydantic import BaseModel, Field


class QuestionOut(BaseModel):
    id: str = Field(example="8b7afeb0-c145-470d-9b85-5f83ba86b9b3")
    question_text: str = Field(example="Which scheduling algorithm can cause starvation?")
    options: list[str] = Field(
        example=[
            "A. FCFS",
            "B. Round Robin",
            "C. Priority Scheduling",
            "D. Multilevel Queue",
        ]
    )
    question_image_urls: list[str] = []
    difficulty: str = Field(example="medium")
    subject_name: str = Field(example="Operating Systems")
    topic_name: str = Field(example="CPU Scheduling")
    subtopic: str | None


class AnswerItem(BaseModel):
    question_id: str = Field(example="8b7afeb0-c145-470d-9b85-5f83ba86b9b3")
    selected_answer: str = Field(example="C")
    time_taken_s: float = Field(ge=0, example=23.4)


class SubmitQuizRequest(BaseModel):
    quiz_type: str = Field(example="diagnostic")
    answers: list[AnswerItem]
    context_payload: dict | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "quiz_type": "diagnostic",
                "answers": [
                    {
                        "question_id": "8b7afeb0-c145-470d-9b85-5f83ba86b9b3",
                        "selected_answer": "C",
                        "time_taken_s": 23.4,
                    },
                    {
                        "question_id": "5d6d9f2f-2e9d-4d31-bf6f-b869f2f709ec",
                        "selected_answer": "A",
                        "time_taken_s": 18.2,
                    },
                ],
                "context_payload": {
                    "source": "daily_planner",
                    "daily_task_id": "f4a2152e-7ab6-4f66-9f5d-3e4de8b95a2a",
                },
            }
        }
    }


class QuizQuestionsResponse(BaseModel):
    questions: list[QuestionOut]
    total: int = Field(example=20)


class CreateMockSessionRequest(BaseModel):
    exam_id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    mock_type: str = Field(example="adaptive")
    session_mode: str = Field(default="full", example="full")
    time_limit_seconds: int = Field(default=3600, ge=300, le=14400, example=3600)
    question_count: int = Field(default=30, ge=5, le=60, example=30)
    year_filter: int | None = Field(default=None, example=2025)


class MockSessionResponse(BaseModel):
    session_id: str = Field(example="ef75efec-9f7a-4709-8bf8-99db1dd1f66c")
    exam_id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    exam_title: str = Field(example="GATE Computer Science")
    mock_type: str = Field(example="adaptive")
    session_mode: str = Field(example="full")
    time_limit_seconds: int = Field(example=3600)
    question_count: int = Field(example=30)
    year_filter: int | None = Field(default=None, example=2025)
    questions: list[QuestionOut] = Field(default_factory=list)
    context_payload: dict = Field(default_factory=dict)
    created_at: str = Field(example="2026-04-05T12:30:00")


class QuizAttemptHistoryItem(BaseModel):
    attempt_id: str = Field(example="ef75efec-9f7a-4709-8bf8-99db1dd1f66c")
    quiz_type: str = Field(example="adaptive")
    score: float = Field(example=72.5)
    correct_count: int = Field(example=18)
    total_questions: int = Field(example=25)
    source: str | None = Field(default=None, example="mock_test")
    exam_id: str | None = Field(default=None, example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    exam_title: str | None = Field(default=None, example="GATE Computer Science")
    mock_type: str | None = Field(default=None, example="adaptive")
    year_filter: int | None = Field(default=None, example=2025)
    submitted_at: str = Field(example="2026-04-05T12:45:00")


class QuizAttemptHistoryResponse(BaseModel):
    attempts: list[QuizAttemptHistoryItem] = Field(default_factory=list)
    total: int = Field(example=4)


class TopicWeaknessSnapshot(BaseModel):
    topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")
    topic_name: str = Field(example="CPU Scheduling")
    subject_name: str = Field(example="Operating Systems")
    weakness_score: float = Field(example=64.2)
    mastery_level: str = Field(example="Weak")
    accuracy: float = Field(example=0.42)
    updated_at: str | None = Field(default=None, example="2026-04-07T14:20:00Z")


class TopicComparisonItem(BaseModel):
    topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")
    topic_name: str = Field(example="CPU Scheduling")
    subject_name: str = Field(example="Operating Systems")
    topic_score_pct: float = Field(example=80.0)
    before: TopicWeaknessSnapshot | None = None
    after: TopicWeaknessSnapshot | None = None


class QuizResultResponse(BaseModel):
    attempt_id: str = Field(example="ef75efec-9f7a-4709-8bf8-99db1dd1f66c")
    quiz_type: str = Field(example="diagnostic")
    score: float = Field(example=72.5)
    correct_count: int = Field(example=29)
    total_questions: int = Field(example=40)
    topic_scores: dict[str, float]
    topic_comparisons: list[TopicComparisonItem] = []
    readiness_before: float | None = Field(default=None, example=41.8)
    readiness_after: float | None = Field(default=None, example=52.6)
    submitted_at: str | None = Field(default=None, example="2026-04-04T12:30:00")
    context_payload: dict | None = None
    analysis_updated_at: str | None = Field(default=None, example="2026-04-07T14:20:00Z")
    result_metadata: dict = Field(default_factory=dict)

    model_config = {
        "json_schema_extra": {
            "example": {
                "attempt_id": "ef75efec-9f7a-4709-8bf8-99db1dd1f66c",
                "quiz_type": "diagnostic",
                "score": 72.5,
                "correct_count": 29,
                "total_questions": 40,
                "topic_scores": {
                    "CPU Scheduling": 80.0,
                    "Deadlocks": 65.0,
                },
                "topic_comparisons": [],
                "readiness_before": 41.8,
                "readiness_after": 52.6,
                "submitted_at": "2026-04-04T12:30:00",
                "analysis_updated_at": "2026-04-04T12:30:01Z",
                "result_metadata": {
                    "mastery_records_updated": 2,
                    "planner_task_completed": True,
                    "mock_session_completed": False,
                },
                "context_payload": {
                    "source": "daily_planner",
                    "daily_task_id": "f4a2152e-7ab6-4f66-9f5d-3e4de8b95a2a",
                },
            }
        }
    }


class QuizAttemptResultResponse(QuizResultResponse):
    pass
