from sqlalchemy import Boolean, Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship
from app.models.base import Base


class NgoPartner(Base):
    """
    Verified NGO Redistribution Partner.
    Tracks cold-chain capability, verified badges, and aggregate impact metrics.
    """
    __tablename__ = "ngo_partners"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    registration_number = Column(String(100), unique=True, nullable=False, index=True)
    contact_person = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    vehicle_type = Column(String(255), nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    verification_badge = Column(String(255), nullable=True)
    total_pickups_completed = Column(Integer, default=0, nullable=False)
    meals_distributed = Column(Integer, default=0, nullable=False)
    logo_url = Column(String(1024), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    users = relationship("User", back_populates="ngo", foreign_keys="User.ngo_id")
    donations = relationship("SurplusDonation", back_populates="claimed_by_ngo", foreign_keys="SurplusDonation.claimed_by_ngo_id")

    def __repr__(self) -> str:
        return f"<NgoPartner {self.id}: {self.name} (verified={self.verified}, active={self.is_active})>"
