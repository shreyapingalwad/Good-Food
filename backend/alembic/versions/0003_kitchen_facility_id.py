"""Add facility_id to kitchen_logs for facility scoping

Revision ID: 0003_add_facility_id_to_kitchen_logs
Revises: 0002_add_server_sessions
Create Date: 2026-10-20 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_kitchen_facility_id"
down_revision: Union[str, None] = "0002_add_server_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure alembic_version table can store long revision IDs on PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(128)")

    op.add_column(
        "kitchen_logs",
        sa.Column(
            "facility_id",
            sa.String(length=255),
            nullable=False,
            server_default="Grand Central Mess - Block B",
        ),
    )
    op.create_index(
        "ix_kitchen_logs_facility_id",
        "kitchen_logs",
        ["facility_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_kitchen_logs_facility_id", table_name="kitchen_logs")
    op.drop_column("kitchen_logs", "facility_id")
