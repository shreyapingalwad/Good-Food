"""
Pydantic schemas for Kitchen Production Logs and Waste Segregation.
"""
from datetime import datetime
import math
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import MealType


def _validate_finite_non_negative(v: float, name: str) -> float:
    if not math.isfinite(v):
        raise ValueError(f"{name} must be a finite numeric value")
    if v < 0:
        raise ValueError(f"{name} cannot be negative")
    return round(float(v), 2)


class KitchenLogBase(BaseModel):
    """Core kitchen production and waste segregation fields."""
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
    dish_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Name of the prepared dish/batch",
    )
    expected_attendance: int = Field(
        ...,
        ge=0,
        description="Headcount forecast or registered opt-ins",
    )
    recommended_kg: float = Field(
        ...,
        description="System recommended batch quantity in kg",
    )
    actual_prepared_kg: float = Field(
        ...,
        description="Actual prepared quantity in kg",
    )
    consumed_kg: float = Field(
        ...,
        description="Actual consumed quantity in kg",
    )
    kitchen_surplus_kg: float = Field(
        ...,
        description="Unserved, edible surplus remaining in kitchen (eligible for redistribution)",
    )
    plate_waste_kg: float = Field(
        ...,
        description="Returned customer plate scraps (ineligible for redistribution)",
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Kitchen supervisor observations",
    )
    image_url: Optional[str] = Field(
        default=None,
        max_length=1024,
        description="Optional dish or batch photo URL",
    )

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Invalid date format or non-existent calendar date: '{v}'")
        return v

    @field_validator("recommended_kg")
    @classmethod
    def validate_rec_kg(cls, v: float) -> float:
        return _validate_finite_non_negative(v, "recommended_kg")

    @field_validator("actual_prepared_kg")
    @classmethod
    def validate_prep_kg(cls, v: float) -> float:
        return _validate_finite_non_negative(v, "actual_prepared_kg")

    @field_validator("consumed_kg")
    @classmethod
    def validate_consumed_kg(cls, v: float) -> float:
        return _validate_finite_non_negative(v, "consumed_kg")

    @field_validator("kitchen_surplus_kg")
    @classmethod
    def validate_surplus_kg(cls, v: float) -> float:
        return _validate_finite_non_negative(v, "kitchen_surplus_kg")

    @field_validator("plate_waste_kg")
    @classmethod
    def validate_plate_waste_kg(cls, v: float) -> float:
        return _validate_finite_non_negative(v, "plate_waste_kg")


class KitchenLogCreateRequest(KitchenLogBase):
    """
    Client request to record kitchen metrics.
    Facility and supervisor identity are derived strictly from the authenticated server session.
    """
    pass


class KitchenLogResponse(KitchenLogBase):
    """
    Detailed kitchen production log returned to authorized staff.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str
    facility_id: str
    recorded_by: str
    created_at: datetime


# Backward compatibility aliases for Phase 1 schemas
class KitchenLogCreate(KitchenLogBase):
    id: Optional[str] = None
    recorded_by: Optional[str] = Field(default=None, max_length=255)


class KitchenLogRead(KitchenLogResponse):
    pass


class KitchenLogHistoryResponse(BaseModel):
    """Paginated list of kitchen production logs."""
    items: list[KitchenLogResponse]
    total: int
    limit: int
    offset: int


class KitchenSummaryResponse(BaseModel):
    """
    Aggregated kitchen waste and production metrics for a facility.
    """
    facility_id: str
    date: Optional[str] = None
    total_batches: int
    total_prepared_kg: float
    total_consumed_kg: float
    total_kitchen_surplus_kg: float
    total_plate_waste_kg: float
    efficiency_rate: float
