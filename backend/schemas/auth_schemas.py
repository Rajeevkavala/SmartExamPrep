from enum import Enum

from pydantic import BaseModel, EmailStr, Field


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


class TokenResponse(BaseModel):
    access_token: str = Field(example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    token_type: str = "bearer"
    role: RoleEnum = Field(example=RoleEnum.student)


class UserResponse(BaseModel):
    id: str = Field(example="3f54d88f-6342-421b-b2f8-2755ee9f66c7")
    email: str = Field(example="student@example.com")
    full_name: str | None = Field(default=None, example="Student One")
    role: RoleEnum = Field(example=RoleEnum.student)
    daily_study_minutes: int = Field(example=60)
    experience_level: str = Field(example="beginner")

    model_config = {"from_attributes": True}
