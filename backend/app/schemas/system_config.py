from datetime import datetime
from typing import Any, Optional
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
