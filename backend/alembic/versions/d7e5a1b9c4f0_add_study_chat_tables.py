"""add study chat tables

Revision ID: d7e5a1b9c4f0
Revises: a91c4e7d2b3f
Create Date: 2026-04-05 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d7e5a1b9c4f0"
down_revision: Union[str, Sequence[str], None] = "a91c4e7d2b3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "study_chat_sessions",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("context_type", sa.String(length=50), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_study_chat_sessions_user_last_used_at",
        "study_chat_sessions",
        ["user_id", "last_used_at"],
        unique=False,
    )

    op.create_table(
        "study_chat_messages",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("session_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("message_text", sa.Text(), nullable=False),
        sa.Column("grounding_snapshot_json", sa.JSON(), nullable=True),
        sa.Column("token_usage_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["study_chat_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_study_chat_messages_session_created_at",
        "study_chat_messages",
        ["session_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_study_chat_messages_session_created_at", table_name="study_chat_messages")
    op.drop_table("study_chat_messages")

    op.drop_index("ix_study_chat_sessions_user_last_used_at", table_name="study_chat_sessions")
    op.drop_table("study_chat_sessions")
