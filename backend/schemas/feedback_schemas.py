from pydantic import BaseModel, Field


class FeedbackCreateRequest(BaseModel):
    weakness_analysis_rating: int = Field(ge=1, le=5, example=4)
    recommendation_rating: int = Field(ge=1, le=5, example=5)
    revision_rating: int = Field(ge=1, le=5, example=4)
    ui_clarity_rating: int = Field(ge=1, le=5, example=3)
    overall_rating: int = Field(ge=1, le=5, example=4)
    comment: str | None = Field(
        default=None,
        max_length=2000,
        example="The weakness analysis was useful, but I wanted clearer explanation on why DBMS was prioritized.",
    )
    context_page: str | None = Field(default="dashboard", max_length=100)


class FeedbackResponse(BaseModel):
    feedback_id: str = Field(example="ef75efec-9f7a-4709-8bf8-99db1dd1f66c")
    weakness_analysis_rating: int = Field(example=4)
    recommendation_rating: int = Field(example=5)
    revision_rating: int = Field(example=4)
    ui_clarity_rating: int = Field(example=3)
    overall_rating: int = Field(example=4)
    comment: str | None = Field(default=None)
    context_page: str | None = Field(default=None)
    created_at: str = Field(example="2026-04-04T14:20:00")
