from sqlalchemy import Boolean, Column, DateTime, Enum, Index, Integer, String, UniqueConstraint, func
from app.models.base import Base
from app.models.enums import MealType


class StudentAttendance(Base):
    """
    Student Attendance model.
    Tracks meal opt-ins and opt-outs per student per meal slot.
    Guarantees uniqueness on (student_id, date, meal_type).
    """
    __tablename__ = "student_attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(64), nullable=False, index=True)
    student_name = Column(String(255), nullable=False)
    date = Column(String(10), nullable=False, index=True, doc="ISO date YYYY-MM-DD")
    meal_type = Column(
        Enum(MealType, native_enum=False, length=20),
        nullable=False
    )
    attending = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "date", "meal_type", name="uq_student_attendance_date_meal"),
        Index("ix_attendance_date_meal", "date", "meal_type"),
    )

    def __repr__(self) -> str:
        status = "attending" if self.attending else "opted-out"
        return f"<StudentAttendance {self.student_id} {self.date} {self.meal_type}: {status}>"
