from sqlalchemy import Column, DateTime, Enum, String, Text, func
from app.models.base import Base
from app.models.enums import AuditSeverity, UserRole


class AuditEvent(Base):
    """
    Tamper-evident operational audit trail.
    Tracks all major system mutations (buffer overrides, meal claims, PIN handovers).
    """
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True)
    timestamp = Column(String(100), nullable=False)
    actor_name = Column(String(255), nullable=False)
    actor_role = Column(
        Enum(UserRole, native_enum=False, length=32),
        nullable=False
    )
    action = Column(String(100), nullable=False, index=True)
    details = Column(Text, nullable=False)
    severity = Column(
        Enum(AuditSeverity, native_enum=False, length=20),
        default=AuditSeverity.INFO,
        nullable=False
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<AuditEvent {self.id}: {self.action} by {self.actor_name} ({self.severity})>"
