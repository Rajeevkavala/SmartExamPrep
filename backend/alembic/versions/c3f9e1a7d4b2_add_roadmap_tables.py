"""add roadmap tables

Revision ID: c3f9e1a7d4b2
Revises: 8f3a6d2c7b10
Create Date: 2026-04-04 21:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3f9e1a7d4b2"
down_revision: Union[str, Sequence[str], None] = "8f3a6d2c7b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "study_roadmaps",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("plan_horizon_weeks", sa.Integer(), nullable=False),
        sa.Column("generation_reason", sa.String(length=100), nullable=True),
        sa.Column("generated_from_attempt_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["generated_from_attempt_id"], ["quiz_attempts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_study_roadmaps_user_id", "study_roadmaps", ["user_id"], unique=False)
    op.create_index(
        "ix_study_roadmaps_user_id_status",
        "study_roadmaps",
        ["user_id", "status"],
        unique=False,
    )

    op.create_table(
        "roadmap_weeks",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("roadmap_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("month_number", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("planned_minutes", sa.Integer(), nullable=False),
        sa.Column("focus_label", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["roadmap_id"], ["study_roadmaps.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("roadmap_id", "week_number", name="uq_roadmap_weeks_roadmap_week"),
    )

    op.create_table(
        "roadmap_week_topics",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("roadmap_week_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("subject_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("topic_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("sequence_order", sa.Integer(), nullable=False),
        sa.Column("priority_score", sa.Float(), nullable=False),
        sa.Column("planned_minutes", sa.Integer(), nullable=False),
        sa.Column("goal_type", sa.String(length=50), nullable=False),
        sa.Column("rationale", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["roadmap_week_id"], ["roadmap_weeks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"]),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "roadmap_week_id",
            "topic_id",
            name="uq_roadmap_week_topics_week_topic",
        ),
    )
    op.create_index(
        "ix_roadmap_week_topics_topic_id",
        "roadmap_week_topics",
        ["topic_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_roadmap_week_topics_topic_id", table_name="roadmap_week_topics")
    op.drop_table("roadmap_week_topics")
    op.drop_table("roadmap_weeks")
    op.drop_index("ix_study_roadmaps_user_id_status", table_name="study_roadmaps")
    op.drop_index("ix_study_roadmaps_user_id", table_name="study_roadmaps")
    op.drop_table("study_roadmaps")
