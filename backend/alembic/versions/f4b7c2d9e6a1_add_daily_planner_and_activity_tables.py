"""add daily planner and activity tables

Revision ID: f4b7c2d9e6a1
Revises: e1a2d4f6c8b9
Create Date: 2026-04-05 09:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f4b7c2d9e6a1"
down_revision: Union[str, Sequence[str], None] = "e1a2d4f6c8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "quiz_attempts",
        sa.Column("context_payload", sa.JSON(), nullable=True),
    )

    op.create_table(
        "daily_study_plans",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("roadmap_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("roadmap_week_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("plan_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("total_planned_minutes", sa.Integer(), nullable=False),
        sa.Column("total_completed_minutes", sa.Integer(), nullable=False),
        sa.Column("carry_forward_from_plan_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["roadmap_id"], ["study_roadmaps.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["roadmap_week_id"], ["roadmap_weeks.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["carry_forward_from_plan_id"],
            ["daily_study_plans.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "plan_date", name="uq_daily_study_plans_user_date"),
    )
    op.create_index(
        "ix_daily_study_plans_user_plan_date",
        "daily_study_plans",
        ["user_id", "plan_date"],
        unique=False,
    )

    op.create_table(
        "daily_study_tasks",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("daily_plan_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("task_type", sa.String(length=50), nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("subject_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("topic_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("resource_hint", sa.String(length=2048), nullable=True),
        sa.Column("target_question_count", sa.Integer(), nullable=True),
        sa.Column("target_minutes", sa.Integer(), nullable=True),
        sa.Column("sequence_order", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("carry_forward_count", sa.Integer(), nullable=False),
        sa.Column("source_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["daily_plan_id"], ["daily_study_plans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_daily_study_tasks_plan_status",
        "daily_study_tasks",
        ["daily_plan_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_daily_study_tasks_topic_id",
        "daily_study_tasks",
        ["topic_id"],
        unique=False,
    )

    op.create_table(
        "study_activity_logs",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("activity_type", sa.String(length=50), nullable=False),
        sa.Column("related_entity_type", sa.String(length=50), nullable=True),
        sa.Column("related_entity_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("questions_solved", sa.Integer(), nullable=False),
        sa.Column("accuracy_pct", sa.Float(), nullable=True),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("quiz_attempt_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("daily_task_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("topic_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["quiz_attempt_id"], ["quiz_attempts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["daily_task_id"], ["daily_study_tasks.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_study_activity_logs_user_activity_date",
        "study_activity_logs",
        ["user_id", "activity_date"],
        unique=False,
    )
    op.create_index(
        "ix_study_activity_logs_user_activity_type",
        "study_activity_logs",
        ["user_id", "activity_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_study_activity_logs_user_activity_type", table_name="study_activity_logs")
    op.drop_index("ix_study_activity_logs_user_activity_date", table_name="study_activity_logs")
    op.drop_table("study_activity_logs")

    op.drop_index("ix_daily_study_tasks_topic_id", table_name="daily_study_tasks")
    op.drop_index("ix_daily_study_tasks_plan_status", table_name="daily_study_tasks")
    op.drop_table("daily_study_tasks")

    op.drop_index("ix_daily_study_plans_user_plan_date", table_name="daily_study_plans")
    op.drop_table("daily_study_plans")

    op.drop_column("quiz_attempts", "context_payload")
