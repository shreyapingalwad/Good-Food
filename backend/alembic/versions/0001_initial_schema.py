"""Initial schema with 8 relational models and integrity constraints

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-20 17:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. ngo_partners
    op.create_table(
        "ngo_partners",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("registration_number", sa.String(length=100), nullable=False),
        sa.Column("contact_person", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("vehicle_type", sa.String(length=255), nullable=False),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("verification_badge", sa.String(length=255), nullable=True),
        sa.Column("total_pickups_completed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("meals_distributed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("logo_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ngo_partners_registration_number", "ngo_partners", ["registration_number"], unique=True)

    # 2. users
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("facility_id", sa.String(length=100), nullable=True),
        sa.Column("ngo_id", sa.String(length=64), sa.ForeignKey("ngo_partners.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    # 3. student_attendance
    op.create_table(
        "student_attendance",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("student_id", sa.String(length=64), nullable=False),
        sa.Column("student_name", sa.String(length=255), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("meal_type", sa.String(length=20), nullable=False),
        sa.Column("attending", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "date", "meal_type", name="uq_student_attendance_date_meal"),
    )
    op.create_index("ix_student_attendance_student_id", "student_attendance", ["student_id"], unique=False)
    op.create_index("ix_student_attendance_date", "student_attendance", ["date"], unique=False)
    op.create_index("ix_attendance_date_meal", "student_attendance", ["date", "meal_type"], unique=False)

    # 4. dish_ratings
    op.create_table(
        "dish_ratings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("dish_id", sa.String(length=64), nullable=False),
        sa.Column("dish_name", sa.String(length=255), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("student_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_dish_rating_1_to_5"),
    )
    op.create_index("ix_dish_ratings_dish_id", "dish_ratings", ["dish_id"], unique=False)
    op.create_index("ix_dish_ratings_student_id", "dish_ratings", ["student_id"], unique=False)
    op.create_index("ix_dish_ratings_created_at", "dish_ratings", ["created_at"], unique=False)

    # 5. kitchen_logs
    op.create_table(
        "kitchen_logs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("meal_type", sa.String(length=20), nullable=False),
        sa.Column("dish_name", sa.String(length=255), nullable=False),
        sa.Column("expected_attendance", sa.Integer(), nullable=False),
        sa.Column("recommended_kg", sa.Float(), nullable=False),
        sa.Column("actual_prepared_kg", sa.Float(), nullable=False),
        sa.Column("consumed_kg", sa.Float(), nullable=False),
        sa.Column("kitchen_surplus_kg", sa.Float(), nullable=False),
        sa.Column("plate_waste_kg", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("recorded_by", sa.String(length=255), nullable=False),
        sa.Column("image_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("expected_attendance >= 0", name="ck_kitchen_attendance_positive"),
        sa.CheckConstraint("recommended_kg >= 0", name="ck_kitchen_rec_positive"),
        sa.CheckConstraint("actual_prepared_kg >= 0", name="ck_kitchen_prep_positive"),
        sa.CheckConstraint("consumed_kg >= 0", name="ck_kitchen_consumed_positive"),
        sa.CheckConstraint("kitchen_surplus_kg >= 0", name="ck_kitchen_surplus_positive"),
        sa.CheckConstraint("plate_waste_kg >= 0", name="ck_kitchen_plate_waste_positive"),
    )
    op.create_index("ix_kitchen_logs_date", "kitchen_logs", ["date"], unique=False)

    # 6. surplus_donations
    op.create_table(
        "surplus_donations",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("food_title", sa.String(length=255), nullable=False),
        sa.Column("dishes", sa.JSON(), nullable=False),
        sa.Column("total_quantity_kg", sa.Float(), nullable=False),
        sa.Column("servings_count", sa.Integer(), nullable=False),
        sa.Column("meal_type", sa.String(length=20), nullable=False),
        sa.Column("prepared_at", sa.String(length=100), nullable=False),
        sa.Column("temperature_at_packaging", sa.Float(), nullable=False),
        sa.Column("is_hygienically_packed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_plate_leftover", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("expiry_deadline", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="AVAILABLE"),
        sa.Column("claimed_by_ngo_id", sa.String(length=64), sa.ForeignKey("ngo_partners.id", ondelete="SET NULL"), nullable=True),
        sa.Column("claimed_by_ngo_name", sa.String(length=255), nullable=True),
        sa.Column("claimed_at", sa.String(length=100), nullable=True),
        sa.Column("pickup_pin_hash", sa.String(length=255), nullable=False),
        sa.Column("completed_at", sa.String(length=100), nullable=True),
        sa.Column("kitchen_facility", sa.String(length=255), nullable=False),
        sa.Column("pickup_location", sa.String(length=255), nullable=False),
        sa.Column("beneficiary_target", sa.String(length=255), nullable=False),
        sa.Column("image_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("total_quantity_kg > 0", name="ck_donation_positive_quantity"),
        sa.CheckConstraint("servings_count > 0", name="ck_donation_positive_servings"),
        sa.CheckConstraint("is_plate_leftover = 0 OR is_plate_leftover = false", name="ck_never_plate_leftover"),
    )
    op.create_index("ix_surplus_donations_status", "surplus_donations", ["status"], unique=False)
    op.create_index("ix_surplus_donations_claimed_by_ngo_id", "surplus_donations", ["claimed_by_ngo_id"], unique=False)

    # 7. audit_events
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("timestamp", sa.String(length=100), nullable=False),
        sa.Column("actor_name", sa.String(length=255), nullable=False),
        sa.Column("actor_role", sa.String(length=32), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False, server_default="info"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_events_action", "audit_events", ["action"], unique=False)
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"], unique=False)

    # 8. system_config
    op.create_table(
        "system_config",
        sa.Column("key", sa.String(length=100), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_by", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("system_config")
    op.drop_table("audit_events")
    op.drop_table("surplus_donations")
    op.drop_table("kitchen_logs")
    op.drop_table("dish_ratings")
    op.drop_table("student_attendance")
    op.drop_table("users")
    op.drop_table("ngo_partners")
