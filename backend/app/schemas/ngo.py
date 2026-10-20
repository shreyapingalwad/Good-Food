from datetime import datetime
from typing import List, Optional
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
    is_active: bool = True


class NgoPartnerCreate(NgoPartnerBase):
    id: Optional[str] = None


class NgoPartnerRead(NgoPartnerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class NgoVerifyRequest(BaseModel):
    verified: bool = Field(..., description="Whether the NGO is verified by administrators")
    verification_badge: Optional[str] = Field(default=None, max_length=255, description="Institutional certification badge description")
    reason: Optional[str] = Field(default=None, max_length=500, description="Administrative justification for audit ledger")


class NgoActivateRequest(BaseModel):
    is_active: bool = Field(..., description="Active operational status")
    reason: Optional[str] = Field(default=None, max_length=500, description="Administrative justification for audit ledger")


class NgoListResponse(BaseModel):
    items: List[NgoPartnerRead]
    total: int
