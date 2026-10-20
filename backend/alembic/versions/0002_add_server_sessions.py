"""Add server_sessions table for secure stateful sessions

Revision ID: 0002_add_server_sessions
Revises: 0001_initial_schema
Create Date: 2026-10-20 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002_add_server_sessions"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "server_sessions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column(
            "user_id",
            sa.String(length=64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_role", sa.String(length=32), nullable=False),
        sa.Column("user_facility_id", sa.String(length=100), nullable=True),
        sa.Column("user_ngo_id", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "last_activity_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_server_sessions_token_hash",
        "server_sessions",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_server_sessions_user_id",
        "server_sessions",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_server_sessions_expires_at",
        "server_sessions",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_sessions_active_expires",
        "server_sessions",
        ["is_active", "expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_sessions_active_expires", table_name="server_sessions")
    op.drop_index("ix_server_sessions_expires_at", table_name="server_sessions")
    op.drop_index("ix_server_sessions_user_id", table_name="server_sessions")
    op.drop_index("ix_server_sessions_token_hash", table_name="server_sessions")
    op.drop_table("server_sessions")
