"""add roadmap day tracking and resources

Revision ID: e1a2d4f6c8b9
Revises: c3f9e1a7d4b2
Create Date: 2026-04-04 23:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e1a2d4f6c8b9"
down_revision: Union[str, Sequence[str], None] = "c3f9e1a7d4b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "roadmap_weeks",
        sa.Column(
            "day_plan_json",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )
    op.add_column(
        "roadmap_weeks",
        sa.Column(
            "tracking_json",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'"),
        ),
    )
    op.add_column(
        "roadmap_week_topics",
        sa.Column(
            "resources_json",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("roadmap_week_topics", "resources_json")
    op.drop_column("roadmap_weeks", "tracking_json")
    op.drop_column("roadmap_weeks", "day_plan_json")
