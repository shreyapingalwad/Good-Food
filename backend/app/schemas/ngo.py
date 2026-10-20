from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class NgoPartnerBase(BaseModel):
    name: str = Field(..., max_length=255)
    registration_number: str = Field(..., max_length=100)
    contact_person: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=50)
    vehicle_type: str = Field(..., max_length=255)
    verified: bool = False
    verification_badge: Optional[str] = None
    total_pickups_completed: int = 0
    meals_distributed: int = 0
    logo_url: Optional[str] = None


class NgoPartnerCreate(NgoPartnerBase):
    id: Optional[str] = None


class NgoPartnerRead(NgoPartnerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
