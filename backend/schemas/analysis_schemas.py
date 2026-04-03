from pydantic import BaseModel, Field


class TopicWeaknessItem(BaseModel):
    topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")
    topic_name: str = Field(example="CPU Scheduling")
    subject_name: str = Field(example="Operating Systems")
    weakness_score: float = Field(example=64.2)
    mastery_level: str = Field(example="Weak")
    accuracy: float = Field(example=0.42)
    total_attempts: int = Field(example=12)


class SubjectProgressItem(BaseModel):
    subject_name: str = Field(example="Operating Systems")
    accuracy: float = Field(example=0.58)


class RecentScoreItem(BaseModel):
    score: float = Field(example=72.5)
    date: str = Field(example="2026-04-02T10:30:00")


class DashboardResponse(BaseModel):
    readiness_score: float = Field(example=55.8)
    weakest_topics: list[TopicWeaknessItem]
    strongest_topics: list[TopicWeaknessItem]
    subjects_progress: list[SubjectProgressItem]
    recent_scores: list[RecentScoreItem] = []
    todays_quiz_ready: bool = Field(example=True)
    nlp_insight: str | None

    model_config = {
        "json_schema_extra": {
            "example": {
                "readiness_score": 55.8,
                "weakest_topics": [
                    {
                        "topic_id": "d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a",
                        "topic_name": "CPU Scheduling",
                        "subject_name": "Operating Systems",
                        "weakness_score": 64.2,
                        "mastery_level": "Weak",
                        "accuracy": 0.42,
                        "total_attempts": 12,
                    }
                ],
                "strongest_topics": [
                    {
                        "topic_id": "a1bcf497-a25c-4f90-bf1a-fdd3702a3f0d",
                        "topic_name": "IP Addressing",
                        "subject_name": "Computer Networks",
                        "weakness_score": 21.5,
                        "mastery_level": "Strong",
                        "accuracy": 0.86,
                        "total_attempts": 14,
                    }
                ],
                "subjects_progress": [
                    {"subject_name": "Operating Systems", "accuracy": 0.58}
                ],
                "recent_scores": [
                    {"score": 72.5, "date": "2026-04-02T10:30:00"}
                ],
                "todays_quiz_ready": True,
                "nlp_insight": None,
            }
        }
    }
