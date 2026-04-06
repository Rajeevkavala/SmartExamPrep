from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, Field

from ai.types import AIMessage


class ResourceItem(BaseModel):
    title: str
    type: Literal["video", "notes", "practice"]
    url: str


class RoadmapTopicEnrichment(BaseModel):
    topic_id: str
    resources: list[ResourceItem]


class RoadmapDayPlan(BaseModel):
    day_number: int = Field(ge=1, le=7)
    title: str
    planned_minutes: int = Field(ge=20, le=360)
    focus_topic_ids: list[str]


class EnrichedRoadmapWeek(BaseModel):
    week_number: int = Field(ge=1)
    focus_label: str
    topics: list[RoadmapTopicEnrichment]
    days: list[RoadmapDayPlan]


class RoadmapEnrichmentPayload(BaseModel):
    weeks: list[EnrichedRoadmapWeek]


def build_messages(
    *,
    month_number: int,
    month_start_date: str,
    month_end_date: str,
    daily_study_minutes: int,
    weekly_input: list[dict],
) -> list[AIMessage]:
    weekly_input_json = json.dumps(weekly_input, ensure_ascii=True)
    return [
        AIMessage(
            role="system",
            content=(
                "You enrich an already deterministic roadmap. "
                "Do not reorder weeks or change which topics are assigned. "
                "Only improve focus labels, suggest practical public resources, and create a realistic 7-day plan for each week."
            ),
        ),
        AIMessage(
            role="user",
            content=(
                f"Month number: {month_number}\n"
                f"Month window: {month_start_date} to {month_end_date}\n"
                f"Daily study minutes target: {daily_study_minutes}\n\n"
                "Return JSON only.\n"
                "Rules:\n"
                "- Keep focus labels short.\n"
                "- Provide 7 day entries per week.\n"
                "- Do not invent topic ids.\n"
                "- Keep resources publicly accessible and practical for GATE CSE students.\n\n"
                f"Weekly input JSON:\n{weekly_input_json}"
            ),
        ),
    ]
