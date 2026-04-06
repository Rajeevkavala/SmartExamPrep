from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator


class GenerateRoadmapRequest(BaseModel):
    force_regenerate: bool = Field(
        default=False,
        description="Create a new roadmap even when one is active.",
    )
    start_date: date | None = Field(default=None, examples=["2026-04-05"])
    generation_reason: str | None = Field(
        default=None,
        max_length=100,
        examples=["manual_generate"],
    )
    priority_topic_ids: list[str] | None = Field(
        default=None,
        description="Optional topic ids to boost while generating a roadmap.",
        examples=[["268cfa8c-4f12-4518-9f97-f2f0f7a3dfd1"]],
    )

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("start_date cannot be in the past.")
        return value


class UpdateRoadmapDayRequest(BaseModel):
    status: str = Field(default="completed", examples=["completed"])

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        allowed = {"pending", "in_progress", "completed"}
        if normalized not in allowed:
            raise ValueError("status must be one of: pending, in_progress, completed.")
        return normalized


class RoadmapResourceItem(BaseModel):
    title: str = Field(..., examples=["NPTEL - CPU Scheduling"])
    type: str = Field(..., examples=["video"])
    url: str = Field(..., examples=["https://nptel.ac.in/"])


class RoadmapTopicItem(BaseModel):
    topic_id: str = Field(..., examples=["268cfa8c-4f12-4518-9f97-f2f0f7a3dfd1"])
    topic_name: str = Field(..., examples=["CPU Scheduling"])
    subject_id: str = Field(..., examples=["3f54d88f-6342-421b-b2f8-2755ee9f66c7"])
    subject_name: str = Field(..., examples=["Operating Systems"])
    sequence_order: int = Field(..., examples=[1])
    priority_score: float = Field(..., examples=[72.5])
    planned_minutes: int = Field(..., examples=[120])
    goal_type: str = Field(..., examples=["practice"])
    resources: list[RoadmapResourceItem] = Field(default_factory=list)
    rationale: dict = Field(default_factory=dict)


class RoadmapDayPlanItem(BaseModel):
    day_number: int = Field(..., examples=[1])
    day_date: date = Field(..., examples=["2026-04-05"])
    title: str = Field(..., examples=["Practice weak Operating Systems concepts"])
    planned_minutes: int = Field(..., examples=[90])
    status: str = Field(..., examples=["pending"])
    completion_pct: float = Field(..., examples=[0.0])
    focus_topic_ids: list[str] = Field(default_factory=list)
    resources: list[RoadmapResourceItem] = Field(default_factory=list)


class RoadmapWeekTracking(BaseModel):
    completed_days: int = Field(..., examples=[2])
    total_days: int = Field(..., examples=[7])
    completion_pct: float = Field(..., examples=[28.57])
    completed_minutes: int = Field(..., examples=[180])
    planned_minutes: int = Field(..., examples=[630])


class RoadmapWeekResponse(BaseModel):
    week_number: int = Field(..., examples=[1])
    month_number: int = Field(..., examples=[1])
    start_date: date = Field(..., examples=["2026-04-05"])
    end_date: date = Field(..., examples=["2026-04-11"])
    planned_minutes: int = Field(..., examples=[630])
    focus_label: str | None = Field(
        default=None,
        examples=["Close weak Operating Systems topics"],
    )
    status: str = Field(..., examples=["pending"])
    topics: list[RoadmapTopicItem] = Field(default_factory=list)
    day_plan: list[RoadmapDayPlanItem] = Field(default_factory=list)
    tracking: RoadmapWeekTracking


class RoadmapSummaryResponse(BaseModel):
    roadmap_id: str = Field(..., examples=["9f5803da-5298-4ca4-9f70-ffc481f4a2f5"])
    status: str = Field(..., examples=["active"])
    plan_horizon_weeks: int = Field(..., examples=[36])
    generation_reason: str | None = Field(default=None, examples=["manual_generate"])
    generated_at: datetime = Field(..., examples=["2026-04-04T18:30:00Z"])
    start_date: date = Field(..., examples=["2026-04-05"])
    end_date: date = Field(..., examples=["2026-12-12"])
    exam_target_date: date | None = Field(default=None, examples=["2026-12-15"])
    total_topics: int = Field(..., examples=[57])
    total_planned_minutes: int = Field(..., examples=[20160])
    weeks_left: int = Field(..., examples=[36])
    generated_weeks: int = Field(..., examples=[4])
    generated_months: int = Field(..., examples=[1])
    total_months: int = Field(..., examples=[9])
    has_more_months: bool = Field(..., examples=[True])
    next_generation_month: int | None = Field(default=None, examples=[2])


class RoadmapCurrentResponse(BaseModel):
    summary: RoadmapSummaryResponse
    weeks: list[RoadmapWeekResponse] = Field(default_factory=list)


class CompleteRoadmapWeekSummary(BaseModel):
    requested_week_number: int = Field(..., examples=[1])
    total_days: int = Field(..., examples=[7])
    already_completed_days: int = Field(..., examples=[2])
    days_updated: list[int] = Field(default_factory=list, examples=[[1, 3, 4, 5, 6]])
    completion_pct: float = Field(..., examples=[100.0])


class CompleteRoadmapWeekResponse(BaseModel):
    week: RoadmapWeekResponse
    summary: CompleteRoadmapWeekSummary
