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
            }
        }
    }


class QuizQuestionsResponse(BaseModel):
    questions: list[QuestionOut]
    total: int = Field(example=20)


class QuizResultResponse(BaseModel):
    attempt_id: str = Field(example="ef75efec-9f7a-4709-8bf8-99db1dd1f66c")
    score: float = Field(example=72.5)
    correct_count: int = Field(example=29)
    total_questions: int = Field(example=40)
    topic_scores: dict[str, float]

    model_config = {
        "json_schema_extra": {
            "example": {
                "attempt_id": "ef75efec-9f7a-4709-8bf8-99db1dd1f66c",
                "score": 72.5,
                "correct_count": 29,
                "total_questions": 40,
                "topic_scores": {
                    "CPU Scheduling": 80.0,
                    "Deadlocks": 65.0,
                },
            }
        }
    }
