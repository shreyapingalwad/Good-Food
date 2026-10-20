from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import MealType


class StudentAttendanceBase(BaseModel):
    student_id: str = Field(..., max_length=64)
    student_name: str = Field(..., max_length=255)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date YYYY-MM-DD")
    meal_type: MealType
    attending: bool = True


class StudentAttendanceCreate(StudentAttendanceBase):
    pass


class StudentAttendanceRead(StudentAttendanceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
