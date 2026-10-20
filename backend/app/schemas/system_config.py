from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SystemConfigBase(BaseModel):
    key: str = Field(..., max_length=100)
    value: Any
    description: Optional[str] = None


class SystemConfigCreate(SystemConfigBase):
    updated_by: Optional[str] = None


class SystemConfigRead(SystemConfigBase):
    model_config = ConfigDict(from_attributes=True)

    updated_at: datetime
    updated_by: Optional[str] = None


class SystemConfigUpdateRequest(BaseModel):
    value: Any = Field(..., description="Configuration value (primitive, dict, or list)")
    reason: str = Field(..., min_length=5, max_length=500, description="Mandatory administrative justification for audit trail")


class SystemConfigListResponse(BaseModel):
    items: List[SystemConfigRead]
    total: int
