from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import MealType


class KitchenLogBase(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    meal_type: MealType
    dish_name: str = Field(..., max_length=255)
    expected_attendance: int = Field(..., ge=0)
    recommended_kg: float = Field(..., ge=0)
    actual_prepared_kg: float = Field(..., ge=0)
    consumed_kg: float = Field(..., ge=0)
    kitchen_surplus_kg: float = Field(..., ge=0, description="Unserved edible surplus")
    plate_waste_kg: float = Field(..., ge=0, description="Customer plate scraps")
    notes: Optional[str] = None
    recorded_by: str = Field(..., max_length=255)
    image_url: Optional[str] = None


class KitchenLogCreate(KitchenLogBase):
    id: Optional[str] = None


class KitchenLogRead(KitchenLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
