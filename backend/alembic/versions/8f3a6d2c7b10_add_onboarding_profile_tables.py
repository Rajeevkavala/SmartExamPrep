"""add onboarding profile tables

Revision ID: 8f3a6d2c7b10
Revises: 1c2d8f4a9b71
Create Date: 2026-04-04 18:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8f3a6d2c7b10"
down_revision: Union[str, Sequence[str], None] = "1c2d8f4a9b71"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("exam_target_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("onboarding_version", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("onboarding_completed_at", sa.DateTime(), nullable=True))

    op.create_table(
        "user_subject_confidences",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("subject_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("confidence_pct", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "subject_id",
            name="uq_user_subject_confidences_user_subject",
        ),
    )

    op.create_table(
        "user_topic_baselines",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("topic_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("already_known", sa.Boolean(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "topic_id",
            name="uq_user_topic_baselines_user_topic",
        ),
    )


def downgrade() -> None:
    op.drop_table("user_topic_baselines")
    op.drop_table("user_subject_confidences")
    op.drop_column("users", "onboarding_completed_at")
    op.drop_column("users", "onboarding_version")
    op.drop_column("users", "exam_target_date")
