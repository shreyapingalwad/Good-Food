from sqlalchemy import CheckConstraint, Column, DateTime, Enum, Float, Integer, String, Text, func
from app.models.base import Base
from app.models.enums import MealType


class KitchenLog(Base):
    """
    Kitchen Production and Waste Log.
    Strictly separates unserved edible surplus (kitchen_surplus_kg)
    from customer plate scraps (plate_waste_kg).
    """
    __tablename__ = "kitchen_logs"

    id = Column(String(64), primary_key=True)
    date = Column(String(10), nullable=False, index=True, doc="ISO date YYYY-MM-DD")
    meal_type = Column(
        Enum(MealType, native_enum=False, length=20),
        nullable=False
    )
    dish_name = Column(String(255), nullable=False)
    expected_attendance = Column(Integer, nullable=False)
    recommended_kg = Column(Float, nullable=False)
    actual_prepared_kg = Column(Float, nullable=False)
    consumed_kg = Column(Float, nullable=False)
    kitchen_surplus_kg = Column(Float, nullable=False, doc="Unserved edible surplus in kitchen")
    plate_waste_kg = Column(Float, nullable=False, doc="Post-consumption plate waste for composting")
    notes = Column(Text, nullable=True)
    recorded_by = Column(String(255), nullable=False)
    facility_id = Column(
        String(255),
        nullable=False,
        default="Grand Central Mess - Block B",
        server_default="Grand Central Mess - Block B",
        index=True,
        doc="Facility / Mess identifier for institutional scoping",
    )
    image_url = Column(String(1024), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("expected_attendance >= 0", name="ck_kitchen_attendance_positive"),
        CheckConstraint("recommended_kg >= 0", name="ck_kitchen_rec_positive"),
        CheckConstraint("actual_prepared_kg >= 0", name="ck_kitchen_prep_positive"),
        CheckConstraint("consumed_kg >= 0", name="ck_kitchen_consumed_positive"),
        CheckConstraint("kitchen_surplus_kg >= 0", name="ck_kitchen_surplus_positive"),
        CheckConstraint("plate_waste_kg >= 0", name="ck_kitchen_plate_waste_positive"),
    )

    def __repr__(self) -> str:
        return f"<KitchenLog {self.id}: {self.dish_name} ({self.date} {self.meal_type})>"
