from sqlalchemy import Column, DateTime, JSON, String, func
from app.models.base import Base


class SystemConfig(Base):
    """
    Central operational parameters (safety buffer, cut-off hours, alert thresholds).
    Stored as structured JSON values keyed by operational parameter name.
    """
    __tablename__ = "system_config"

    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by = Column(String(255), nullable=True)

    def __repr__(self) -> str:
        return f"<SystemConfig key={self.key}>"
