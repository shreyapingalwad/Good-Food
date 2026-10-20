"""Add is_active to ngo_partners for administrative lifecycle control

Revision ID: 0004_add_is_active_to_ngo_partners
Revises: 0003_add_facility_id_to_kitchen_logs
Create Date: 2026-10-20 21:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0004_ngo_is_active"
down_revision: Union[str, None] = "0003_kitchen_facility_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ngo_partners",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.create_index(
        "ix_ngo_partners_is_active",
        "ngo_partners",
        ["is_active"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ngo_partners_is_active", table_name="ngo_partners")
    op.drop_column("ngo_partners", "is_active")
