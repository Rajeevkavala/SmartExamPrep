from pydantic import BaseModel, Field


class ExplainRequest(BaseModel):
    topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")

    model_config = {
        "json_schema_extra": {
            "example": {"topic_id": "d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a"}
        }
    }


class PredictionRow(BaseModel):
    topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")
    topic_name: str = Field(example="CPU Scheduling")
    subject_name: str = Field(example="Operating Systems")
    probability: int = Field(example=82, ge=0, le=100)
    trend: str = Field(example="Rising")
    priority: str = Field(example="High")
    expected_questions: int = Field(example=2, ge=0)
    appearance_count: int = Field(example=6, ge=0)
    last_appeared_year: int | None = Field(default=None, example=2025)
    reason: str = Field(
        example="Appears repeatedly across recent PYQs and remains one of the strongest repeat clusters."
    )


class RepeatTopicItem(BaseModel):
    topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")
    topic_name: str = Field(example="CPU Scheduling")
    subject_name: str = Field(example="Operating Systems")
    appearance_count: int = Field(example=6, ge=0)
    years_appeared: list[int] = Field(default_factory=list, example=[2020, 2021, 2023, 2025])
    pattern: str = Field(example="Recurring in 4 out of the last 6 PYQ seasons.")
    priority: str = Field(example="Must Study")


class PredictionSnapshotResponse(BaseModel):
    exam_id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    exam_title: str = Field(example="GATE Computer Science")
    generated_at: str = Field(example="2026-04-05T12:30:00")
    insight: str = Field(
        example="Focus first on CPU Scheduling, Routing Protocols, and SQL constraints for the next revision block."
    )
    rows: list[PredictionRow] = Field(default_factory=list)
    repeat_topics: list[RepeatTopicItem] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class RefreshPredictionRequest(BaseModel):
    exam_id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")


class CopyPredictionToRoadmapRequest(BaseModel):
    topic_ids: list[str] | None = Field(default=None)
    force_regenerate: bool = Field(default=False)


class CopyPredictionToRoadmapResponse(BaseModel):
    copied_topic_ids: list[str] = Field(default_factory=list)
    roadmap_id: str = Field(example="9f5803da-5298-4ca4-9f70-ffc481f4a2f5")
    generation_reason: str = Field(example="prediction_copy")
