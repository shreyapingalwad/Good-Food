from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.enums import UserRole


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    role: UserRole
    facility_id: Optional[str] = None
    ngo_id: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Plaintext password, hashed before storage")


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
