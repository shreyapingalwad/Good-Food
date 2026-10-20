"""
Pydantic schemas for Surplus Food Donation Offers and Redistribution.
"""
from datetime import datetime, timezone
import math
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import DonationStatus, MealType


def _validate_finite_positive(v: float, name: str) -> float:
    if not math.isfinite(v):
        raise ValueError(f"{name} must be a finite numeric value")
    if v <= 0:
        raise ValueError(f"{name} must be greater than zero")
    return round(float(v), 2)


class DishItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of dish component")
    quantityKg: float = Field(..., description="Weight in kilograms")

    @field_validator("quantityKg")
    @classmethod
    def validate_quantity(cls, v: float) -> float:
        return _validate_finite_positive(v, "quantityKg")


class SurplusDonationBase(BaseModel):
    food_title: str = Field(..., min_length=1, max_length=255, description="Headline description of donation offer")
    dishes: List[DishItem] = Field(..., min_length=1, description="List of unserved dish items")
    total_quantity_kg: float = Field(..., description="Total batch weight in kg")
    servings_count: int = Field(..., gt=0, description="Estimated meal portions")
    meal_type: MealType = Field(..., description="Originating meal slot")
    prepared_at: str = Field(..., min_length=1, max_length=100, description="Preparation time label")
    temperature_at_packaging: float = Field(..., description="Degrees Celsius at packaging")
    is_hygienically_packed: bool = Field(default=True, description="Hygiene packing verification")
    is_plate_leftover: bool = Field(
        default=False,
        description="Strict invariant: donations must NEVER be plate leftovers",
    )
    expiry_deadline: str = Field(..., min_length=1, max_length=100, description="ISO timestamp of expiration")
    pickup_location: str = Field(..., min_length=1, max_length=255, description="Facility dispatch location")
    beneficiary_target: str = Field(..., min_length=1, max_length=255, description="Intended distribution target")
    image_url: Optional[str] = Field(default=None, max_length=1024)

    @field_validator("total_quantity_kg")
    @classmethod
    def validate_total_kg(cls, v: float) -> float:
        return _validate_finite_positive(v, "total_quantity_kg")

    @field_validator("temperature_at_packaging")
    @classmethod
    def validate_temperature(cls, v: float) -> float:
        if not math.isfinite(v):
            raise ValueError("temperature_at_packaging must be a finite numeric value")
        # Critical food safety rule: food in the danger zone (8°C to 60°C) cannot be donated
        if 8.0 < v < 60.0:
            raise ValueError(
                f"Critical Temperature Warning ({v}°C): Food must be hot-held (>= 60°C) "
                f"or rapid-chilled (<= 8°C) before safe packing."
            )
        return round(float(v), 2)

    @field_validator("is_plate_leftover")
    @classmethod
    def validate_not_leftover(cls, v: bool) -> bool:
        if v is True:
            raise ValueError(
                "Food Safety Policy Violation: Customer plate leftovers strictly barred "
                "from human consumption redistribution."
            )
        return False

    @field_validator("expiry_deadline")
    @classmethod
    def validate_expiry_future(cls, v: str) -> str:
        try:
            # Normalize ISO string with Z or timezone offset
            clean_str = v.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            if dt <= now:
                raise ValueError("Expiry deadline must be in the future.")
        except Exception as e:
            if "Expiry deadline must be in the future" in str(e):
                raise
            # If not strict ISO, ensure it is non-empty
            if not v.strip():
                raise ValueError("Expiry deadline cannot be empty.")
        return v

    @model_validator(mode="after")
    def validate_dishes_and_total_consistency(self) -> "SurplusDonationBase":
        """
        Validates mathematical consistency between individual dish weights and total_quantity_kg.
        Normalizes the total weight from dish items server-side to prevent tampering or drift.
        """
        if self.dishes:
            dishes_sum = round(sum(d.quantityKg for d in self.dishes), 2)
            if abs(dishes_sum - self.total_quantity_kg) > 0.05:
                raise ValueError(
                    f"Dishes quantity sum ({dishes_sum} kg) does not match total_quantity_kg ({self.total_quantity_kg} kg)."
                )
            self.total_quantity_kg = dishes_sum
        return self


class SurplusDonationCreateRequest(SurplusDonationBase):
    """
    Client request to create a surplus donation offer.
    Facility is derived strictly from the authenticated kitchen staff's session.
    """
    pass


class SurplusDonationRead(SurplusDonationBase):
    """
    Representation of a surplus donation offer for authorized readers.
    Notice: pickup_pin_hash and plaintext PIN are NEVER exposed in this schema.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: DonationStatus
    kitchen_facility: str
    claimed_by_ngo_id: Optional[str] = None
    claimed_by_ngo_name: Optional[str] = None
    claimed_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SurplusDonationCreateResponse(SurplusDonationRead):
    """
    Response returned ONLY to the creating kitchen supervisor upon creation.
    Contains the one-time plaintext pickup PIN to hand over to the authorized driver.
    """
    pickup_pin: str


class SurplusDonationListResponse(BaseModel):
    """List of surplus donation offers."""
    items: List[SurplusDonationRead]
    total: int


class DonationClaimRequest(BaseModel):
    """
    Optional client payload for claiming an available surplus donation.
    Notice: Claiming NGO identity is strictly derived from the server session,
    never accepted from the client request.
    """
    notes: Optional[str] = Field(default=None, max_length=500, description="Optional pickup notes or driver dispatch reference")


class PickupVerificationRequest(BaseModel):
    """
    Verification payload submitted by authorized kitchen staff at the gate
    when an NGO collection driver arrives.
    """
    pin: str = Field(..., min_length=4, max_length=6, description="4-digit security pickup PIN")

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned.isdigit() or len(cleaned) != 4:
            raise ValueError("Pickup PIN must be exactly 4 numeric digits")
        return cleaned


class PickupVerificationResponse(SurplusDonationRead):
    """
    Confirmation returned to kitchen staff upon successful PIN verification
    and atomic handover completion.
    """
    success: bool = True
    message: str = "Handover verified and donation completed successfully."


# Backward compatibility aliases
class SurplusDonationCreate(SurplusDonationBase):
    id: Optional[str] = None
    kitchen_facility: Optional[str] = Field(default=None, max_length=255)
    pickup_pin: Optional[str] = Field(
        default=None,
        min_length=4,
        max_length=6,
        description="Optional 4-digit PIN; generated securely if omitted",
    )

