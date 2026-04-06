"""add pyq question indexes

Revision ID: a91c4e7d2b3f
Revises: f4b7c2d9e6a1
Create Date: 2026-04-05 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a91c4e7d2b3f"
down_revision: Union[str, Sequence[str], None] = "f4b7c2d9e6a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_questions_source_type_year",
        "questions",
        ["source_type", "year"],
        unique=False,
    )
    op.create_index(
        "ix_questions_subject_topic_source_type",
        "questions",
        ["subject_id", "topic_id", "source_type"],
        unique=False,
    )
    op.create_index(
        "ix_questions_verified_source_type",
        "questions",
        ["is_verified", "source_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_questions_verified_source_type", table_name="questions")
    op.drop_index("ix_questions_subject_topic_source_type", table_name="questions")
    op.drop_index("ix_questions_source_type_year", table_name="questions")
