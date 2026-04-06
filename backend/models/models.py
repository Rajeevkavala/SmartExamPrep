import enum
import uuid
from datetime import datetime

from sqlalchemy import (
	Boolean,
	Column,
	Date,
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
	phone = Column(String(50), nullable=True)
	language = Column(String(50), nullable=True)
	timezone = Column(String(100), nullable=True)
	role = Column(SAEnum(RoleEnum), default=RoleEnum.student, nullable=False)
	daily_study_minutes = Column(Integer, default=60)
	experience_level = Column(String(50), default="beginner")
	email_notifications_enabled = Column(Boolean, default=True, nullable=False)
	push_notifications_enabled = Column(Boolean, default=True, nullable=False)
	study_reminders_enabled = Column(Boolean, default=True, nullable=False)
	exam_target_date = Column(Date, nullable=True)
	onboarding_version = Column(Integer, nullable=True)
	onboarding_completed_at = Column(DateTime, nullable=True)
	is_active = Column(Boolean, default=True)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	quiz_attempts = relationship("QuizAttempt", back_populates="user")
	topic_masteries = relationship("TopicMastery", back_populates="user")
	revision_schedules = relationship("RevisionSchedule", back_populates="user")
	roadmaps = relationship(
		"StudyRoadmap",
		back_populates="user",
		cascade="all, delete-orphan",
	)
	daily_study_plans = relationship(
		"DailyStudyPlan",
		back_populates="user",
		cascade="all, delete-orphan",
	)
	study_activity_logs = relationship(
		"StudyActivityLog",
		back_populates="user",
		cascade="all, delete-orphan",
	)
	study_chat_sessions = relationship(
		"StudyChatSession",
		back_populates="user",
		cascade="all, delete-orphan",
	)
	subject_confidences = relationship(
		"UserSubjectConfidence",
		back_populates="user",
		cascade="all, delete-orphan",
	)
	topic_baselines = relationship(
		"UserTopicBaseline",
		back_populates="user",
		cascade="all, delete-orphan",
	)
	scrape_jobs = relationship("ScrapeJob", back_populates="initiated_by_user")
	syllabus_uploads = relationship("SyllabusUpload", back_populates="uploaded_by_user")
	feedback_entries = relationship("UserFeedback", back_populates="user")
	student_uploads = relationship(
		"StudentUpload",
		back_populates="user",
		cascade="all, delete-orphan",
	)
	mock_quiz_sessions = relationship(
		"MockQuizSession",
		back_populates="user",
		cascade="all, delete-orphan",
	)
	generated_prediction_snapshots = relationship(
		"ExamPredictionSnapshot",
		back_populates="generated_by_user",
	)


class ExamCatalog(Base):
	__tablename__ = "exam_catalog"

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	code = Column(String(100), unique=True, nullable=False, index=True)
	title = Column(String(255), nullable=False)
	category = Column(String(100), nullable=False, default="Engineering")
	description = Column(Text, nullable=True)
	subject_ids = Column(JSON, default=list, nullable=False)
	topic_count_override = Column(Integer, nullable=True)
	pyq_count_override = Column(Integer, nullable=True)
	enrolled_count_override = Column(Integer, nullable=True)
	is_active = Column(Boolean, default=True, nullable=False)
	sort_order = Column(Integer, default=0, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	prediction_snapshots = relationship(
		"ExamPredictionSnapshot",
		back_populates="exam",
		cascade="all, delete-orphan",
	)
	uploads = relationship("StudentUpload", back_populates="exam")
	mock_quiz_sessions = relationship("MockQuizSession", back_populates="exam")


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
	subject_confidence_entries = relationship("UserSubjectConfidence", back_populates="subject")
	roadmap_week_topics = relationship("RoadmapWeekTopic", back_populates="subject")
	daily_study_tasks = relationship("DailyStudyTask", back_populates="subject")


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
	topic_baseline_entries = relationship("UserTopicBaseline", back_populates="topic")
	roadmap_week_topics = relationship("RoadmapWeekTopic", back_populates="topic")
	daily_study_tasks = relationship("DailyStudyTask", back_populates="topic")
	activity_logs = relationship("StudyActivityLog", back_populates="topic")


class Question(Base):
	__tablename__ = "questions"
	__table_args__ = (
		Index("ix_questions_source_type_year", "source_type", "year"),
		Index(
			"ix_questions_subject_topic_source_type",
			"subject_id",
			"topic_id",
			"source_type",
		),
		Index("ix_questions_verified_source_type", "is_verified", "source_type"),
	)

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
	context_payload = Column(JSON, default=dict)
	result_snapshot = Column(JSON, default=dict)
	started_at = Column(DateTime, default=datetime.utcnow)
	completed_at = Column(DateTime, nullable=True)

	user = relationship("User", back_populates="quiz_attempts")
	generated_roadmaps = relationship("StudyRoadmap", back_populates="generated_from_attempt")
	activity_logs = relationship("StudyActivityLog", back_populates="quiz_attempt")


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


class UserSubjectConfidence(Base):
	__tablename__ = "user_subject_confidences"
	__table_args__ = (
		UniqueConstraint("user_id", "subject_id", name="uq_user_subject_confidences_user_subject"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	subject_id = Column(UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
	confidence_pct = Column(Integer, nullable=False)
	source = Column(String(50), default="onboarding", nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	user = relationship("User", back_populates="subject_confidences")
	subject = relationship("Subject", back_populates="subject_confidence_entries")


class UserTopicBaseline(Base):
	__tablename__ = "user_topic_baselines"
	__table_args__ = (
		UniqueConstraint("user_id", "topic_id", name="uq_user_topic_baselines_user_topic"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
	already_known = Column(Boolean, default=True, nullable=False)
	source = Column(String(50), default="onboarding", nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	user = relationship("User", back_populates="topic_baselines")
	topic = relationship("Topic", back_populates="topic_baseline_entries")


class StudyRoadmap(Base):
	__tablename__ = "study_roadmaps"
	__table_args__ = (
		Index("ix_study_roadmaps_user_id", "user_id"),
		Index("ix_study_roadmaps_user_id_status", "user_id", "status"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	status = Column(String(50), default="active", nullable=False)
	plan_horizon_weeks = Column(Integer, default=52, nullable=False)
	generation_reason = Column(String(100), nullable=True)
	generated_from_attempt_id = Column(
		UUID(as_uuid=False),
		ForeignKey("quiz_attempts.id"),
		nullable=True,
	)
	generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	start_date = Column(Date, nullable=False)
	end_date = Column(Date, nullable=False)
	metadata_json = Column(JSON, default=dict, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	user = relationship("User", back_populates="roadmaps")
	generated_from_attempt = relationship("QuizAttempt", back_populates="generated_roadmaps")
	weeks = relationship(
		"RoadmapWeek",
		back_populates="roadmap",
		cascade="all, delete-orphan",
	)
	daily_plans = relationship("DailyStudyPlan", back_populates="roadmap")


class RoadmapWeek(Base):
	__tablename__ = "roadmap_weeks"
	__table_args__ = (
		UniqueConstraint("roadmap_id", "week_number", name="uq_roadmap_weeks_roadmap_week"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	roadmap_id = Column(
		UUID(as_uuid=False),
		ForeignKey("study_roadmaps.id", ondelete="CASCADE"),
		nullable=False,
	)
	week_number = Column(Integer, nullable=False)
	month_number = Column(Integer, nullable=False)
	start_date = Column(Date, nullable=False)
	end_date = Column(Date, nullable=False)
	planned_minutes = Column(Integer, default=0, nullable=False)
	focus_label = Column(String(255), nullable=True)
	status = Column(String(50), default="pending", nullable=False)
	day_plan_json = Column(JSON, default=list, nullable=False)
	tracking_json = Column(JSON, default=dict, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	roadmap = relationship("StudyRoadmap", back_populates="weeks")
	topics = relationship(
		"RoadmapWeekTopic",
		back_populates="roadmap_week",
		cascade="all, delete-orphan",
	)
	daily_plans = relationship("DailyStudyPlan", back_populates="roadmap_week")


class RoadmapWeekTopic(Base):
	__tablename__ = "roadmap_week_topics"
	__table_args__ = (
		UniqueConstraint("roadmap_week_id", "topic_id", name="uq_roadmap_week_topics_week_topic"),
		Index("ix_roadmap_week_topics_topic_id", "topic_id"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	roadmap_week_id = Column(
		UUID(as_uuid=False),
		ForeignKey("roadmap_weeks.id", ondelete="CASCADE"),
		nullable=False,
	)
	subject_id = Column(UUID(as_uuid=False), ForeignKey("subjects.id"), nullable=False)
	topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False)
	sequence_order = Column(Integer, default=1, nullable=False)
	priority_score = Column(Float, default=0.0, nullable=False)
	planned_minutes = Column(Integer, default=0, nullable=False)
	goal_type = Column(String(50), default="learn", nullable=False)
	rationale = Column(JSON, default=dict, nullable=False)
	resources_json = Column(JSON, default=list, nullable=False)

	roadmap_week = relationship("RoadmapWeek", back_populates="topics")
	subject = relationship("Subject", back_populates="roadmap_week_topics")
	topic = relationship("Topic", back_populates="roadmap_week_topics")


class DailyStudyPlan(Base):
	__tablename__ = "daily_study_plans"
	__table_args__ = (
		UniqueConstraint("user_id", "plan_date", name="uq_daily_study_plans_user_date"),
		Index("ix_daily_study_plans_user_plan_date", "user_id", "plan_date"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	roadmap_id = Column(UUID(as_uuid=False), ForeignKey("study_roadmaps.id", ondelete="SET NULL"), nullable=True)
	roadmap_week_id = Column(UUID(as_uuid=False), ForeignKey("roadmap_weeks.id", ondelete="SET NULL"), nullable=True)
	plan_date = Column(Date, nullable=False)
	status = Column(String(50), default="active", nullable=False)
	total_planned_minutes = Column(Integer, default=0, nullable=False)
	total_completed_minutes = Column(Integer, default=0, nullable=False)
	carry_forward_from_plan_id = Column(
		UUID(as_uuid=False),
		ForeignKey("daily_study_plans.id", ondelete="SET NULL"),
		nullable=True,
	)
	metadata_json = Column(JSON, default=dict, nullable=False)
	generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	user = relationship("User", back_populates="daily_study_plans")
	roadmap = relationship("StudyRoadmap", back_populates="daily_plans")
	roadmap_week = relationship("RoadmapWeek", back_populates="daily_plans")
	tasks = relationship(
		"DailyStudyTask",
		back_populates="daily_plan",
		cascade="all, delete-orphan",
	)
	carry_forward_from_plan = relationship(
		"DailyStudyPlan",
		remote_side=[id],
	)


class DailyStudyTask(Base):
	__tablename__ = "daily_study_tasks"
	__table_args__ = (
		Index("ix_daily_study_tasks_plan_status", "daily_plan_id", "status"),
		Index("ix_daily_study_tasks_topic_id", "topic_id"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	daily_plan_id = Column(
		UUID(as_uuid=False),
		ForeignKey("daily_study_plans.id", ondelete="CASCADE"),
		nullable=False,
	)
	task_type = Column(String(50), nullable=False)
	source_type = Column(String(50), default="planner", nullable=False)
	subject_id = Column(UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
	topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
	title = Column(String(255), nullable=False)
	description = Column(Text, nullable=True)
	resource_hint = Column(String(2048), nullable=True)
	target_question_count = Column(Integer, nullable=True)
	target_minutes = Column(Integer, nullable=True)
	sequence_order = Column(Integer, default=1, nullable=False)
	status = Column(String(50), default="pending", nullable=False)
	completed_at = Column(DateTime, nullable=True)
	carry_forward_count = Column(Integer, default=0, nullable=False)
	source_payload = Column(JSON, default=dict, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	daily_plan = relationship("DailyStudyPlan", back_populates="tasks")
	subject = relationship("Subject", back_populates="daily_study_tasks")
	topic = relationship("Topic", back_populates="daily_study_tasks")
	activity_logs = relationship("StudyActivityLog", back_populates="daily_task")


class StudyActivityLog(Base):
	__tablename__ = "study_activity_logs"
	__table_args__ = (
		Index("ix_study_activity_logs_user_activity_date", "user_id", "activity_date"),
		Index("ix_study_activity_logs_user_activity_type", "user_id", "activity_type"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	activity_type = Column(String(50), nullable=False)
	related_entity_type = Column(String(50), nullable=True)
	related_entity_id = Column(UUID(as_uuid=False), nullable=True)
	duration_minutes = Column(Integer, default=0, nullable=False)
	questions_solved = Column(Integer, default=0, nullable=False)
	accuracy_pct = Column(Float, nullable=True)
	activity_date = Column(Date, nullable=False)
	payload_json = Column(JSON, default=dict, nullable=False)
	quiz_attempt_id = Column(UUID(as_uuid=False), ForeignKey("quiz_attempts.id", ondelete="SET NULL"), nullable=True)
	daily_task_id = Column(UUID(as_uuid=False), ForeignKey("daily_study_tasks.id", ondelete="SET NULL"), nullable=True)
	topic_id = Column(UUID(as_uuid=False), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)

	user = relationship("User", back_populates="study_activity_logs")
	quiz_attempt = relationship("QuizAttempt", back_populates="activity_logs")
	daily_task = relationship("DailyStudyTask", back_populates="activity_logs")
	topic = relationship("Topic", back_populates="activity_logs")


class StudyChatSession(Base):
	__tablename__ = "study_chat_sessions"
	__table_args__ = (
		Index("ix_study_chat_sessions_user_last_used_at", "user_id", "last_used_at"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	title = Column(String(255), nullable=False, default="New Study Chat")
	context_type = Column(String(50), nullable=False, default="general")
	last_used_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	metadata_json = Column(JSON, default=dict, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	user = relationship("User", back_populates="study_chat_sessions")
	messages = relationship(
		"StudyChatMessage",
		back_populates="session",
		cascade="all, delete-orphan",
	)


class StudyChatMessage(Base):
	__tablename__ = "study_chat_messages"
	__table_args__ = (
		Index("ix_study_chat_messages_session_created_at", "session_id", "created_at"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	session_id = Column(
		UUID(as_uuid=False),
		ForeignKey("study_chat_sessions.id", ondelete="CASCADE"),
		nullable=False,
	)
	role = Column(String(20), nullable=False)
	message_text = Column(Text, nullable=False)
	grounding_snapshot_json = Column(JSON, nullable=True)
	token_usage_json = Column(JSON, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)

	session = relationship("StudyChatSession", back_populates="messages")


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


class StudentUpload(Base):
	__tablename__ = "student_uploads"
	__table_args__ = (
		Index("ix_student_uploads_user_created_at", "user_id", "created_at"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	exam_id = Column(UUID(as_uuid=False), ForeignKey("exam_catalog.id", ondelete="SET NULL"), nullable=True)
	filename = Column(String(500), nullable=False)
	upload_path = Column(String(1000), nullable=False)
	file_size_bytes = Column(Integer, default=0, nullable=False)
	status = Column(SAEnum(JobStatusEnum), default=JobStatusEnum.pending, nullable=False)
	processing_mode = Column(String(50), default="pending", nullable=False)
	extracted_text_preview = Column(Text, nullable=True)
	generated_questions = Column(JSON, default=list, nullable=False)
	question_count = Column(Integer, default=0, nullable=False)
	error_message = Column(Text, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	user = relationship("User", back_populates="student_uploads")
	exam = relationship("ExamCatalog", back_populates="uploads")


class ExamPredictionSnapshot(Base):
	__tablename__ = "exam_prediction_snapshots"
	__table_args__ = (
		Index("ix_exam_prediction_snapshots_exam_generated_at", "exam_id", "generated_at"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	exam_id = Column(UUID(as_uuid=False), ForeignKey("exam_catalog.id", ondelete="CASCADE"), nullable=False)
	generated_by_user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
	insight_text = Column(Text, nullable=True)
	rows_json = Column(JSON, default=list, nullable=False)
	repeat_topics_json = Column(JSON, default=list, nullable=False)
	metadata_json = Column(JSON, default=dict, nullable=False)
	generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	exam = relationship("ExamCatalog", back_populates="prediction_snapshots")
	generated_by_user = relationship("User", back_populates="generated_prediction_snapshots")


class MockQuizSession(Base):
	__tablename__ = "mock_quiz_sessions"
	__table_args__ = (
		Index("ix_mock_quiz_sessions_user_created_at", "user_id", "created_at"),
		Index("ix_mock_quiz_sessions_status_expires_at", "status", "expires_at"),
	)

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	exam_id = Column(UUID(as_uuid=False), ForeignKey("exam_catalog.id", ondelete="SET NULL"), nullable=True)
	mock_type = Column(String(50), nullable=False)
	session_mode = Column(String(50), default="full", nullable=False)
	time_limit_seconds = Column(Integer, default=3600, nullable=False)
	question_count = Column(Integer, default=30, nullable=False)
	year_filter = Column(Integer, nullable=True)
	context_payload = Column(JSON, default=dict, nullable=False)
	question_ids = Column(JSON, default=list, nullable=False)
	status = Column(String(50), default="ready", nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	expires_at = Column(DateTime, nullable=True)
	completed_at = Column(DateTime, nullable=True)

	user = relationship("User", back_populates="mock_quiz_sessions")
	exam = relationship("ExamCatalog", back_populates="mock_quiz_sessions")


class UserFeedback(Base):
	__tablename__ = "user_feedback"

	id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
	user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	weakness_analysis_rating = Column(Integer, nullable=False)
	recommendation_rating = Column(Integer, nullable=False)
	revision_rating = Column(Integer, nullable=False)
	ui_clarity_rating = Column(Integer, nullable=False)
	overall_rating = Column(Integer, nullable=False)
	comment = Column(Text, nullable=True)
	context_page = Column(String(100), nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)

	user = relationship("User", back_populates="feedback_entries")


__all__ = [
	"Base",
	"RoleEnum",
	"DifficultyEnum",
	"SourceTypeEnum",
	"MasteryLevelEnum",
	"JobStatusEnum",
	"User",
	"ExamCatalog",
	"Subject",
	"Topic",
	"Question",
	"QuizAttempt",
	"TopicMastery",
	"RevisionSchedule",
	"UserSubjectConfidence",
	"UserTopicBaseline",
	"StudyRoadmap",
	"RoadmapWeek",
	"RoadmapWeekTopic",
	"DailyStudyPlan",
	"DailyStudyTask",
	"StudyActivityLog",
	"StudyChatSession",
	"StudyChatMessage",
	"ScrapeJob",
	"SyllabusUpload",
	"StudentUpload",
	"ExamPredictionSnapshot",
	"MockQuizSession",
	"UserFeedback",
]
