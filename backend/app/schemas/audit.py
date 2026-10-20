from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import AuditSeverity, UserRole


class AuditEventBase(BaseModel):
    timestamp: str = Field(..., max_length=100)
    actor_name: str = Field(..., max_length=255)
    actor_role: UserRole
    action: str = Field(..., max_length=100)
    details: str
    severity: AuditSeverity = AuditSeverity.INFO


class AuditEventCreate(AuditEventBase):
    id: str = Field(..., max_length=64)


class AuditEventRead(AuditEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
