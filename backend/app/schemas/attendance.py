"""
Pydantic schemas for student attendance management.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import MealType


class StudentAttendanceBase(BaseModel):
    date: str = Field(
        ...,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Date in YYYY-MM-DD format",
        examples=["2026-10-21"],
    )
    meal_type: MealType = Field(
        ...,
        description="Meal slot: Breakfast, Lunch, Snacks, or Dinner",
    )
    attending: bool = Field(
        default=True,
        description="True for attending/opt-in, False for opt-out",
    )

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Invalid date format or non-existent calendar date: '{v}'")
        return v


class AttendanceSubmitRequest(StudentAttendanceBase):
    """
    Client request to record or update meal attendance.
    Student identity is derived strictly from the server-side session.
    """
    pass


class StudentAttendanceCreate(StudentAttendanceBase):
    """Backward compatibility alias for Phase 1 schemas."""
    student_id: Optional[str] = None
    student_name: Optional[str] = None


class AttendanceResponse(StudentAttendanceBase):
    """
    Representation of an attendance record returned to authorized clients.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: str
    student_name: str
    created_at: datetime
    updated_at: datetime


class StudentAttendanceRead(AttendanceResponse):
    """Backward compatibility alias for Phase 1 schemas."""
    pass


class AttendanceHistoryResponse(BaseModel):
    """
    Paginated history of the authenticated student's attendance records.
    """
    items: list[AttendanceResponse]
    total: int
    limit: int
    offset: int


class MealAttendanceStat(BaseModel):
    """Aggregate statistics for a single meal slot."""
    meal_type: MealType
    attending_count: int
    opted_out_count: int
    total_responses: int


class FacilityAttendanceSummary(BaseModel):
    """
    Facility-scoped summary of attendance responses for managers and admins.
    """
    date: str
    facility_id: str
    total_students_enrolled: int
    overall_attending: int
    overall_opted_out: int
    meals: list[MealAttendanceStat]
