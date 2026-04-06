"""add result snapshot and feedback

Revision ID: 1c2d8f4a9b71
Revises: b16989f61b2d
Create Date: 2026-04-04 15:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1c2d8f4a9b71"
down_revision: Union[str, Sequence[str], None] = "b16989f61b2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("quiz_attempts", sa.Column("result_snapshot", sa.JSON(), nullable=True))

    op.create_table(
        "user_feedback",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("weakness_analysis_rating", sa.Integer(), nullable=False),
        sa.Column("recommendation_rating", sa.Integer(), nullable=False),
        sa.Column("revision_rating", sa.Integer(), nullable=False),
        sa.Column("ui_clarity_rating", sa.Integer(), nullable=False),
        sa.Column("overall_rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("context_page", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("user_feedback")
    op.drop_column("quiz_attempts", "result_snapshot")
