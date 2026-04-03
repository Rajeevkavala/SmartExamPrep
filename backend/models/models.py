import enum
import uuid
from datetime import datetime

from sqlalchemy import (
	Boolean,
	Column,
	DateTime,
	Enum as SAEnum,
	Float,
	ForeignKey,
	Index,
	Integer,
	JSON,
	String,
	Text,
	UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship


Base = declarative_base()


def gen_uuid() -> str:
	return str(uuid.uuid4())


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


class User(Base):
	__tablename__ = "users"

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	email = Column(String(255), unique=True, nullable=False, index=True)
	hashed_password = Column(String(255), nullable=False)
	full_name = Column(String(255), nullable=True)
	role = Column(SAEnum(RoleEnum), default=RoleEnum.student, nullable=False)
	daily_study_minutes = Column(Integer, default=60)
	experience_level = Column(String(50), default="beginner")
	is_active = Column(Boolean, default=True)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	quiz_attempts = relationship("QuizAttempt", back_populates="user")
	topic_masteries = relationship("TopicMastery", back_populates="user")
	revision_schedules = relationship("RevisionSchedule", back_populates="user")
	scrape_jobs = relationship("ScrapeJob", back_populates="initiated_by_user")
	syllabus_uploads = relationship("SyllabusUpload", back_populates="uploaded_by_user")


class Subject(Base):
	__tablename__ = "subjects"

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	name = Column(String(255), unique=True, nullable=False)
	description = Column(Text, nullable=True)
	display_order = Column(Integer, default=0)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")
	questions = relationship("Question", back_populates="subject")


class Topic(Base):
	__tablename__ = "topics"

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	subject_id = Column(UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
	name = Column(String(255), nullable=False)
	subtopics = Column(JSON, default=list)
	nlp_keyword_tags = Column(JSON, default=list)
	display_order = Column(Integer, default=0)
	difficulty_weight = Column(Float, default=1.0)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	subject = relationship("Subject", back_populates="topics")
	questions = relationship("Question", back_populates="topic")
	masteries = relationship("TopicMastery", back_populates="topic")
	revision_schedules = relationship("RevisionSchedule", back_populates="topic")


class Question(Base):
	__tablename__ = "questions"

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	subject_id = Column(UUID(as_uuid=False), ForeignKey("subjects.id"), nullable=False)
	topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False)
	subtopic = Column(String(255), nullable=True)
	question_text = Column(Text, nullable=False)
	options = Column(JSON, nullable=False)
	question_image_urls = Column(JSON, default=list)
	correct_answer = Column(String(5), nullable=False)
	explanation = Column(Text, nullable=True)
	difficulty = Column(SAEnum(DifficultyEnum), nullable=False)
	source_type = Column(SAEnum(SourceTypeEnum), default=SourceTypeEnum.practice)
	source_url = Column(String(2048), nullable=True)
	year = Column(Integer, nullable=True)
	nlp_keyword_tags = Column(JSON, default=list)
	embedding_id = Column(String(255), nullable=True)
	is_verified = Column(Boolean, default=True)
	created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
	scrape_job_id = Column(UUID(as_uuid=False), ForeignKey("scrape_jobs.id"), nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	subject = relationship("Subject", back_populates="questions")
	topic = relationship("Topic", back_populates="questions")
	creator = relationship("User", foreign_keys=[created_by])


class QuizAttempt(Base):
	__tablename__ = "quiz_attempts"

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	quiz_type = Column(String(50), nullable=False)
	score = Column(Float, nullable=True)
	total_questions = Column(Integer, nullable=False)
	correct_count = Column(Integer, default=0)
	answers = Column(JSON, nullable=False)
	started_at = Column(DateTime, default=datetime.utcnow)
	completed_at = Column(DateTime, nullable=True)

	user = relationship("User", back_populates="quiz_attempts")


class TopicMastery(Base):
	__tablename__ = "topic_masteries"
	__table_args__ = (
		UniqueConstraint("user_id", "topic_id", name="uq_topic_masteries_user_topic"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False)
	accuracy = Column(Float, default=0.0)
	weakness_score = Column(Float, default=50.0)
	mastery_level = Column(
		SAEnum(
			MasteryLevelEnum,
			values_callable=lambda members: [member.value for member in members],
			name="masterylevelenum",
		),
		default=MasteryLevelEnum.moderate,
	)
	total_attempts = Column(Integer, default=0)
	correct_attempts = Column(Integer, default=0)
	avg_response_time_s = Column(Float, default=0.0)
	last_attempted_at = Column(DateTime, nullable=True)
	next_revision_date = Column(DateTime, nullable=True)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	user = relationship("User", back_populates="topic_masteries")
	topic = relationship("Topic", back_populates="masteries")


class RevisionSchedule(Base):
	__tablename__ = "revision_schedules"
	__table_args__ = (
		Index("ix_revision_schedules_user_id_topic_id", "user_id", "topic_id"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False)
	due_date = Column(DateTime, nullable=False)
	interval_days = Column(Integer, default=1)
	ease_factor = Column(Float, default=2.5)
	repetition_count = Column(Integer, default=0)
	last_score_pct = Column(Float, default=0.0)
	is_done = Column(Boolean, default=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	user = relationship("User", back_populates="revision_schedules")
	topic = relationship("Topic", back_populates="revision_schedules")


class ScrapeJob(Base):
	__tablename__ = "scrape_jobs"

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	url = Column(String(2048), nullable=False)
	initiated_by_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
	status = Column(SAEnum(JobStatusEnum), default=JobStatusEnum.pending)
	notes = Column(Text, nullable=True)
	raw_html = Column(Text, nullable=True)
	extracted_questions = Column(JSON, default=list)
	questions_imported = Column(Integer, default=0)
	error_message = Column(Text, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	initiated_by_user = relationship("User", back_populates="scrape_jobs")


class SyllabusUpload(Base):
	__tablename__ = "syllabus_uploads"

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	uploaded_by_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
	filename = Column(String(500), nullable=False)
	upload_path = Column(String(1000), nullable=False)
	status = Column(SAEnum(JobStatusEnum), default=JobStatusEnum.pending)
	extracted_structure = Column(JSON, nullable=True)
	subjects_imported = Column(Integer, default=0)
	topics_imported = Column(Integer, default=0)
	error_message = Column(Text, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	uploaded_by_user = relationship("User", back_populates="syllabus_uploads")


__all__ = [
	"Base",
	"RoleEnum",
	"DifficultyEnum",
	"SourceTypeEnum",
	"MasteryLevelEnum",
	"JobStatusEnum",
	"User",
	"Subject",
	"Topic",
	"Question",
	"QuizAttempt",
	"TopicMastery",
	"RevisionSchedule",
	"ScrapeJob",
	"SyllabusUpload",
]
