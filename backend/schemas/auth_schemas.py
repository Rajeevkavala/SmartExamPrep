from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class RoleEnum(str, Enum):
    student = "student"
    admin = "admin"


class RegisterRequest(BaseModel):
    email: EmailStr = Field(example="student@example.com")
    password: str = Field(min_length=8, example="Student@123")
    full_name: str | None = Field(default=None, example="Student One")

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "student@example.com",
                "password": "Student@123",
                "full_name": "Student One",
            }
        }
    }


class LoginRequest(BaseModel):
    email: EmailStr = Field(example="student@example.com")
    password: str = Field(example="Student@123")

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "student@example.com",
                "password": "Student@123",
            }
        }
    }


ExperienceLevel = Literal["beginner", "intermediate", "advanced"]
OnboardingState = Literal["complete", "incomplete"]


class SubjectConfidenceItem(BaseModel):
    subject_id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    confidence_pct: int = Field(ge=0, le=100, example=65)


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255, example="Student One")
    phone: str | None = Field(default=None, max_length=50, example="+91 9876543210")
    language: str | None = Field(default=None, max_length=50, example="en")
    timezone: str | None = Field(default=None, max_length=100, example="Asia/Kolkata")
    daily_study_minutes: int | None = Field(default=None, ge=30, le=180, example=90)
    experience_level: ExperienceLevel | None = Field(default=None, example="beginner")
    email_notifications_enabled: bool | None = Field(default=None, example=True)
    push_notifications_enabled: bool | None = Field(default=None, example=True)
    study_reminders_enabled: bool | None = Field(default=None, example=True)
    exam_target_date: date | None = Field(default=None, example="2026-12-15")
    subject_confidences: list[SubjectConfidenceItem] | None = Field(default=None)
    known_topic_ids: list[str] | None = Field(default=None)

    model_config = {
        "json_schema_extra": {
            "example": {
                "full_name": "Student One",
                "phone": "+91 9876543210",
                "language": "en",
                "timezone": "Asia/Kolkata",
                "daily_study_minutes": 90,
                "experience_level": "intermediate",
                "email_notifications_enabled": True,
                "push_notifications_enabled": True,
                "study_reminders_enabled": True,
                "exam_target_date": "2026-12-15",
                "subject_confidences": [
                    {
                        "subject_id": "3f54d88f-6342-421b-b2f8-2755ee9f66c7",
                        "confidence_pct": 70,
                    }
                ],
                "known_topic_ids": [
                    "268cfa8c-4f12-4518-9f97-f2f0f7a3dfd1"
                ],
            }
        }
    }

    @field_validator("exam_target_date")
    @classmethod
    def validate_exam_target_date(cls, value: date | None) -> date | None:
        if value is not None and value <= date.today():
            raise ValueError("Exam target date must be in the future.")
        return value


class TokenResponse(BaseModel):
    access_token: str = Field(example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    token_type: str = "bearer"
    role: RoleEnum = Field(example=RoleEnum.student)
    expires_at: datetime = Field(
        example="2026-04-08T12:00:00Z",
    )


class UserResponse(BaseModel):
    id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    email: str = Field(example="student@example.com")
    full_name: str | None = Field(default=None, example="Student One")
    phone: str | None = Field(default=None, example="+91 9876543210")
    language: str | None = Field(default=None, example="en")
    timezone: str | None = Field(default=None, example="Asia/Kolkata")
    role: RoleEnum = Field(example=RoleEnum.student)
    daily_study_minutes: int | None = Field(default=None, example=60)
    experience_level: ExperienceLevel | None = Field(default=None, example="beginner")
    email_notifications_enabled: bool = Field(default=True, example=True)
    push_notifications_enabled: bool = Field(default=True, example=True)
    study_reminders_enabled: bool = Field(default=True, example=True)
    exam_target_date: date | None = Field(default=None, example="2026-12-15")
    onboarding_version: int | None = Field(default=None, example=2)
    onboarding_completed_at: datetime | None = Field(
        default=None,
        example="2026-04-04T12:00:00Z",
    )
    onboarding_state: OnboardingState = Field(default="incomplete", example="complete")
    roadmap_ready: bool = Field(default=False, example=True)
    missing_profile_fields: list[str] = Field(
        default_factory=list,
        example=["subject_confidences"],
    )
    profile_last_updated_at: datetime | None = Field(
        default=None,
        example="2026-04-05T09:15:00Z",
    )
    created_at: datetime | None = Field(
        default=None,
        example="2026-04-01T10:00:00Z",
    )
    updated_at: datetime | None = Field(
        default=None,
        example="2026-04-05T09:15:00Z",
    )
    subject_confidences: list[SubjectConfidenceItem] = Field(default_factory=list)
    known_topic_ids: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}
