# PHASE 2 — DATABASE DESIGN

> **Goal:** Design the complete PostgreSQL schema using SQLAlchemy ORM, Alembic migrations, and Pydantic schemas for all entities in SmartExamPrep.

---

## 1. SQLAlchemy Models (`backend/models/models.py`)

```python
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, Enum as SAEnum, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base
import enum

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

# ─── Enums ────────────────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    student = "student"
    admin = "admin"

class DifficultyEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class SourceTypeEnum(str, enum.Enum):
    PYQ = "PYQ"
    practice = "practice"
    scraped = "scraped"

class MasteryLevelEnum(str, enum.Enum):
    weak = "Weak"
    moderate = "Moderate"
    strong = "Strong"

class JobStatusEnum(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    failed = "failed"

# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    """
    Represents both students and admins.
    Role field controls access to admin endpoints.
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(SAEnum(RoleEnum), default=RoleEnum.student, nullable=False)
    daily_study_minutes = Column(Integer, default=60)
    experience_level = Column(String(50), default="beginner")  # beginner/intermediate/advanced
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    topic_masteries = relationship("TopicMastery", back_populates="user")
    revision_schedules = relationship("RevisionSchedule", back_populates="user")
    scrape_jobs = relationship("ScrapeJob", back_populates="initiated_by_user")
    syllabus_uploads = relationship("SyllabusUpload", back_populates="uploaded_by_user")

# ─── Subject ──────────────────────────────────────────────────────────────────

class Subject(Base):
    """
    Top-level GATE CSE subject (e.g., Operating Systems, DBMS).
    Created by admin via syllabus upload or manual entry.
    """
    __tablename__ = "subjects"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="subject")

# ─── Topic ────────────────────────────────────────────────────────────────────

class Topic(Base):
    """
    A topic within a subject. Contains an ordered list of subtopics as JSON.
    Example: subject=OS, topic=CPU Scheduling,
             subtopics=["FCFS","SJF","Round Robin","Priority"]
    """
    __tablename__ = "topics"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    subject_id = Column(UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    subtopics = Column(JSON, default=list)       # ["subtopic1", "subtopic2", ...]
    nlp_keyword_tags = Column(JSON, default=list) # ["scheduling", "cpu", "process"]
    display_order = Column(Integer, default=0)
    difficulty_weight = Column(Float, default=1.0) # 1.0=normal, 1.5=hard topic
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subject = relationship("Subject", back_populates="topics")
    questions = relationship("Question", back_populates="topic")
    masteries = relationship("TopicMastery", back_populates="topic")
    revision_schedules = relationship("RevisionSchedule", back_populates="topic")

# ─── Question ─────────────────────────────────────────────────────────────────

class Question(Base):
    """
    Stores PYQ, practice, or scraped questions.
    NLP tags and embedding reference enable ML recommendation and deduplication.
    Scraped questions start with is_verified=False until admin approves.
    """
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    subject_id = Column(UUID(as_uuid=False), ForeignKey("subjects.id"), nullable=False)
    topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False)
    subtopic = Column(String(255), nullable=True)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)         # ["A. ...", "B. ...", "C. ...", "D. ..."]
    question_image_urls = Column(JSON, default=list)  # ["https://...", "https://..."]
    correct_answer = Column(String(5), nullable=False)  # "A", "B", "C", or "D"
    explanation = Column(Text, nullable=True)
    difficulty = Column(SAEnum(DifficultyEnum), nullable=False)
    source_type = Column(SAEnum(SourceTypeEnum), default=SourceTypeEnum.practice)
    source_url = Column(String(2048), nullable=True)    # Populated for scraped questions
    year = Column(Integer, nullable=True)               # For PYQs (e.g. 2022)
    nlp_keyword_tags = Column(JSON, default=list)       # spaCy extracted tags
    embedding_id = Column(String(255), nullable=True)   # Reference to vector store (future)
    is_verified = Column(Boolean, default=True)         # False for scraped until admin verifies
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    scrape_job_id = Column(UUID(as_uuid=False), ForeignKey("scrape_jobs.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subject = relationship("Subject", back_populates="questions")
    topic = relationship("Topic", back_populates="questions")
    creator = relationship("User", foreign_keys=[created_by])

# ─── QuizAttempt ──────────────────────────────────────────────────────────────

class QuizAttempt(Base):
    """
    Records a complete quiz session: questions asked, answers given,
    time taken per question. This drives the ML weakness engine.
    """
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quiz_type = Column(String(50), nullable=False)   # "diagnostic" | "adaptive"
    score = Column(Float, nullable=True)             # Percentage (0–100)
    total_questions = Column(Integer, nullable=False)
    correct_count = Column(Integer, default=0)
    answers = Column(JSON, nullable=False)           # [{question_id, selected, correct, time_taken_s}]
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="quiz_attempts")

# ─── TopicMastery ─────────────────────────────────────────────────────────────

class TopicMastery(Base):
    """
    Central ML output table. One row per (user, topic) pair.
    Updated after every quiz attempt.
    weakness_score is the output of WeaknessDetector ML model.
    """
    __tablename__ = "topic_masteries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False)
    accuracy = Column(Float, default=0.0)           # 0.0–1.0
    weakness_score = Column(Float, default=50.0)    # 0–100 (ML output)
    mastery_level = Column(SAEnum(MasteryLevelEnum), default=MasteryLevelEnum.moderate)
    total_attempts = Column(Integer, default=0)
    correct_attempts = Column(Integer, default=0)
    avg_response_time_s = Column(Float, default=0.0)
    last_attempted_at = Column(DateTime, nullable=True)
    next_revision_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="topic_masteries")
    topic = relationship("Topic", back_populates="masteries")

# ─── RevisionSchedule ─────────────────────────────────────────────────────────

class RevisionSchedule(Base):
    """
    SM-2 spaced repetition schedule per (user, topic).
    interval_days is computed by SpacedRevisionScheduler.
    """
    __tablename__ = "revision_schedules"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False)
    due_date = Column(DateTime, nullable=False)
    interval_days = Column(Integer, default=1)
    ease_factor = Column(Float, default=2.5)        # SM-2 ease factor
    repetition_count = Column(Integer, default=0)
    last_score_pct = Column(Float, default=0.0)
    is_done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="revision_schedules")
    topic = relationship("Topic", back_populates="revision_schedules")

# ─── ScrapeJob ────────────────────────────────────────────────────────────────

class ScrapeJob(Base):
    """
    Tracks an admin-initiated web scraping job.
    raw_html is stored for reprocessing if Gemini classification fails.
    extracted_questions holds unverified question JSON before admin approval.
    """
    __tablename__ = "scrape_jobs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    url = Column(String(2048), nullable=False)
    initiated_by_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    status = Column(SAEnum(JobStatusEnum), default=JobStatusEnum.pending)
    notes = Column(Text, nullable=True)
    raw_html = Column(Text, nullable=True)          # Stored for re-processing
    extracted_questions = Column(JSON, default=list) # Raw Gemini output before verify
    questions_imported = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    initiated_by_user = relationship("User", back_populates="scrape_jobs")

# ─── SyllabusUpload ───────────────────────────────────────────────────────────

class SyllabusUpload(Base):
    """
    Tracks a syllabus PDF uploaded by admin.
    extracted_structure holds the JSON tree: {subjects: [{name, topics: [{name, subtopics}]}]}
    After admin reviews, import_structure_to_db creates Subject + Topic records.
    """
    __tablename__ = "syllabus_uploads"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    uploaded_by_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    upload_path = Column(String(1000), nullable=False)
    status = Column(SAEnum(JobStatusEnum), default=JobStatusEnum.pending)
    extracted_structure = Column(JSON, nullable=True)  # Subject/Topic/Subtopic tree
    subjects_imported = Column(Integer, default=0)
    topics_imported = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    uploaded_by_user = relationship("User", back_populates="syllabus_uploads")
```

---

## 2. Alembic Setup

```bash
# Initialize Alembic (run once)
cd backend
alembic init alembic

# In alembic/env.py, set:
from models.models import Base
target_metadata = Base.metadata

# Generate first migration
alembic revision --autogenerate -m "initial schema"

# Apply migrations
alembic upgrade head
```

### Key relationships that Alembic must handle:
- `questions.subject_id` → `subjects.id`
- `questions.topic_id` → `topics.id`
- `questions.created_by` → `users.id`
- `questions.scrape_job_id` → `scrape_jobs.id`
- `topic_masteries.user_id + topic_id` → unique constraint
- `revision_schedules.user_id + topic_id` → composite index

---

## 3. Pydantic Schemas (`backend/schemas/`)

### auth_schemas.py
```python
from pydantic import BaseModel, EmailStr
from enum import Enum

class RoleEnum(str, Enum):
    student = "student"
    admin = "admin"

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: RoleEnum

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    role: RoleEnum
    daily_study_minutes: int
    experience_level: str

    class Config:
        from_attributes = True
```

### quiz_schemas.py
```python
from pydantic import BaseModel

class QuestionOut(BaseModel):
    id: str
    question_text: str
    options: list[str]
    question_image_urls: list[str] = []
    difficulty: str
    subject_name: str
    topic_name: str
    subtopic: str | None

class AnswerItem(BaseModel):
    question_id: str
    selected_answer: str
    time_taken_s: float

class SubmitQuizRequest(BaseModel):
    quiz_type: str  # "diagnostic" | "adaptive"
    answers: list[AnswerItem]

class QuizResultResponse(BaseModel):
    attempt_id: str
    score: float
    correct_count: int
    total_questions: int
    topic_scores: dict[str, float]  # topic_name → accuracy
```

### analysis_schemas.py
```python
from pydantic import BaseModel

class TopicWeaknessItem(BaseModel):
    topic_id: str
    topic_name: str
    subject_name: str
    weakness_score: float        # 0–100
    mastery_level: str           # Weak / Moderate / Strong
    accuracy: float
    total_attempts: int

class DashboardResponse(BaseModel):
    readiness_score: float
    weakest_topics: list[TopicWeaknessItem]
    strongest_topics: list[TopicWeaknessItem]
    subjects_progress: list[dict]
    todays_quiz_ready: bool
    nlp_insight: str | None
```

### admin_schemas.py
```python
from pydantic import BaseModel

class SubjectCreate(BaseModel):
    name: str
    description: str | None = None
    display_order: int = 0

class SubjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    display_order: int | None = None

class TopicCreate(BaseModel):
    name: str
    subtopics: list[str] = []
    nlp_keyword_tags: list[str] = []
    display_order: int = 0
    difficulty_weight: float = 1.0

class TopicUpdate(BaseModel):
    name: str | None = None
    subtopics: list[str] | None = None
    nlp_keyword_tags: list[str] | None = None
    difficulty_weight: float | None = None

class QuestionCreate(BaseModel):
    subject_id: str
    topic_id: str
    subtopic: str | None = None
    question_text: str
    options: list[str]
    question_image_urls: list[str] = []
    correct_answer: str
    explanation: str | None = None
    difficulty: str
    source_type: str = "practice"
    source_url: str | None = None
    year: int | None = None

class QuestionUpdate(BaseModel):
    subtopic: str | None = None
    question_text: str | None = None
    options: list[str] | None = None
    question_image_urls: list[str] | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    difficulty: str | None = None
    source_type: str | None = None
    year: int | None = None
    is_verified: bool | None = None

class BulkVerifyRequest(BaseModel):
    question_ids: list[str]
```

### scraper_schemas.py
```python
from pydantic import BaseModel, HttpUrl

class ScrapeStartRequest(BaseModel):
    url: HttpUrl
    notes: str | None = None

class ScrapeJobResponse(BaseModel):
    job_id: str
    url: str
    status: str
    notes: str | None
    extracted_questions: list[dict]
    questions_imported: int
    error_message: str | None
    created_at: str

class ImportJobRequest(BaseModel):
    accepted_indices: list[int]  # Indices from extracted_questions to import
```

### syllabus_schemas.py
```python
from pydantic import BaseModel

class SyllabusUploadResponse(BaseModel):
    upload_id: str
    filename: str
    status: str
    extracted_structure: dict | None
    subjects_imported: int
    topics_imported: int
    created_at: str

class ImportSyllabusRequest(BaseModel):
    # Optional: allow admin to pass edited structure before import
    structure: dict | None = None
```

---

## 4. Model Explanations

| Model | Why It Exists |
|---|---|
| `User` | Single user table for both roles. Role field controls backend access. |
| `Subject` | Created from PDF syllabus. Top-level curriculum unit. |
| `Topic` | Sub-unit with subtopics JSON — avoids a separate Subtopic table for MVP. |
| `Question` | Core content entity. `is_verified` ensures scraped questions need admin approval. |
| `QuizAttempt` | Source of truth for all ML features (accuracy, time, patterns). |
| `TopicMastery` | ML output store. Updated after each quiz. Drives recommendations + revision. |
| `RevisionSchedule` | SM-2 output. One active schedule per topic per user. |
| `ScrapeJob` | Tracks async scraping. Stores raw HTML for reprocessing. |
| `SyllabusUpload` | Tracks PDF uploads. Extracted JSON reviewed before import. |

---

## 5. PYQ Image Support Addendum

Update Question-related schema definitions with multi-image support:

- SQLAlchemy model: add `question_image_urls = Column(JSON, default=list)`.
- Pydantic schemas (`QuestionCreate`, `QuestionUpdate`, `QuestionOut`): add `question_image_urls: list[str] = []`.
- ScrapeJob extracted question object: include `question_image_urls` in each extracted payload.
- Migration note: create one Alembic revision adding the new JSON column with `[]` default for existing rows.
