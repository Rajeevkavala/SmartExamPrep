from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


ALLOWED_CONTEXT_TYPES = {
    "general",
    "roadmap",
    "planner",
    "weak_topic",
    "pyq",
    "concept",
}


class CreateChatSessionRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255, examples=["Roadmap doubts"])
    context_type: str = Field(default="general", examples=["general"])

    @field_validator("context_type")
    @classmethod
    def validate_context_type(cls, value: str) -> str:
        normalized = (value or "general").strip().lower()
        if normalized not in ALLOWED_CONTEXT_TYPES:
            raise ValueError(
                "context_type must be one of: general, roadmap, planner, weak_topic, pyq, concept."
            )
        return normalized


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=4000, examples=["What should I study today?"])

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("message must contain at least 2 non-space characters.")
        return normalized


class ChatMessageResponse(BaseModel):
    id: str = Field(..., examples=["f6d61be0-7a2d-4a7f-a7d8-9e8b845dc5f7"])
    role: str = Field(..., examples=["assistant"])
    message_text: str
    grounding_snapshot_json: dict | None = None
    token_usage_json: dict | None = None
    created_at: datetime


class ChatSessionSummary(BaseModel):
    session_id: str = Field(..., examples=["9f5803da-5298-4ca4-9f70-ffc481f4a2f5"])
    title: str = Field(..., examples=["Roadmap doubts"])
    context_type: str = Field(..., examples=["roadmap"])
    last_used_at: datetime
    created_at: datetime
    updated_at: datetime | None = None
    last_message_preview: str | None = Field(default=None, examples=["Your current week focuses on..."])
    message_count: int = Field(default=0, examples=[6])


class ChatSessionListResponse(BaseModel):
    sessions: list[ChatSessionSummary] = Field(default_factory=list)


class ChatSessionResponse(BaseModel):
    session: ChatSessionSummary
    messages: list[ChatMessageResponse] = Field(default_factory=list)


class SendChatMessageResponse(BaseModel):
    session: ChatSessionSummary
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
