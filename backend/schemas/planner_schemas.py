from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class GenerateTodayPlanRequest(BaseModel):
    force_regenerate: bool = Field(
        default=False,
        description="Regenerate today's plan even if one already exists.",
    )
    include_carry_forward: bool = Field(
        default=True,
        description="Carry unfinished tasks from yesterday into today's plan.",
    )


class UpdatePlannerTaskRequest(BaseModel):
    status: str = Field(default="completed", examples=["completed"])

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        allowed = {"pending", "in_progress", "completed", "skipped"}
        if normalized not in allowed:
            raise ValueError("status must be one of: pending, in_progress, completed, skipped.")
        return normalized


class CarryForwardRequest(BaseModel):
    from_date: date | None = Field(default=None)


class PlannerTaskItem(BaseModel):
    task_id: str = Field(..., examples=["f4a2152e-7ab6-4f66-9f5d-3e4de8b95a2a"])
    task_type: str = Field(..., examples=["practice"])
    source_type: str = Field(..., examples=["roadmap"])
    subject_id: str | None = None
    subject_name: str | None = None
    topic_id: str | None = None
    topic_name: str | None = None
    title: str = Field(..., examples=["Practice CPU Scheduling"])
    description: str | None = None
    resource_hint: str | None = None
    target_question_count: int | None = None
    target_minutes: int | None = None
    sequence_order: int = Field(..., examples=[1])
    status: str = Field(..., examples=["pending"])
    completed_at: datetime | None = None
    carry_forward_count: int = Field(..., examples=[0])
    source_payload: dict = Field(default_factory=dict)


class PlannerSummary(BaseModel):
    total_tasks: int = Field(..., examples=[5])
    completed_tasks: int = Field(..., examples=[2])
    pending_tasks: int = Field(..., examples=[3])
    completion_pct: float = Field(..., examples=[40.0])
    total_planned_minutes: int = Field(..., examples=[240])
    total_completed_minutes: int = Field(..., examples=[95])


class DailyPlanResponse(BaseModel):
    plan_id: str = Field(..., examples=["b43ca713-70ca-45d2-a513-4acf0174fef5"])
    plan_date: date = Field(..., examples=["2026-04-05"])
    status: str = Field(..., examples=["active"])
    total_planned_minutes: int = Field(..., examples=[240])
    total_completed_minutes: int = Field(..., examples=[95])
    completion_pct: float = Field(..., examples=[39.6])
    generated_at: datetime = Field(..., examples=["2026-04-05T08:00:00Z"])
    roadmap_id: str | None = None
    roadmap_week_id: str | None = None
    roadmap_week_number: int | None = None
    roadmap_focus_label: str | None = None
    carry_forward_from_plan_id: str | None = None
    has_carry_forward: bool = Field(default=False)
    summary: PlannerSummary
    tasks: list[PlannerTaskItem] = Field(default_factory=list)


class PlannerStatusResponse(BaseModel):
    success: bool = Field(default=True)
    plan: DailyPlanResponse
