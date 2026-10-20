from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models.enums import DonationStatus, MealType


class DishItem(BaseModel):
    name: str = Field(..., max_length=255)
    quantityKg: float = Field(..., gt=0)


class SurplusDonationBase(BaseModel):
    food_title: str = Field(..., max_length=255)
    dishes: List[DishItem]
    total_quantity_kg: float = Field(..., gt=0)
    servings_count: int = Field(..., gt=0)
    meal_type: MealType
    prepared_at: str = Field(..., max_length=100)
    temperature_at_packaging: float = Field(..., description="Degrees Celsius at packaging")
    is_hygienically_packed: bool = True
    is_plate_leftover: Literal[False] = Field(
        default=False,
        description="Strict invariant: donations must never be plate leftovers"
    )
    expiry_deadline: str = Field(..., max_length=100)
    kitchen_facility: str = Field(..., max_length=255)
    pickup_location: str = Field(..., max_length=255)
    beneficiary_target: str = Field(..., max_length=255)
    image_url: Optional[str] = None

    @field_validator("is_plate_leftover")
    @classmethod
    def validate_not_leftover(cls, v: bool) -> bool:
        if v is True:
            raise ValueError("Plate leftovers are strictly prohibited from redistribution for human consumption.")
        return False


class SurplusDonationCreate(SurplusDonationBase):
    id: Optional[str] = None
    pickup_pin: Optional[str] = Field(
        default=None,
        min_length=4,
        max_length=6,
        description="Optional 4-digit PIN; generated securely if omitted"
    )


class SurplusDonationRead(SurplusDonationBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: DonationStatus
    claimed_by_ngo_id: Optional[str] = None
    claimed_by_ngo_name: Optional[str] = None
    claimed_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Notice: pickup_pin_hash is strictly omitted from read schema
