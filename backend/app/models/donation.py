from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enums import DonationStatus, MealType


class SurplusDonation(Base):
    """
    Surplus Food Donation and NGO Handover.
    Guarantees food safety invariants:
    - Never plate leftovers (enforced via database CHECK constraint).
    - Hashed pickup PIN (bcrypt - never plaintext in database).
    - Temperature and packaging hygiene metadata.
    """
    __tablename__ = "surplus_donations"

    id = Column(String(64), primary_key=True, doc="e.g. DON-8841")
    food_title = Column(String(255), nullable=False)
    dishes = Column(JSON, nullable=False, doc="JSON list of {name: str, quantityKg: float}")
    total_quantity_kg = Column(Float, nullable=False)
    servings_count = Column(Integer, nullable=False)
    meal_type = Column(
        Enum(MealType, native_enum=False, length=20),
        nullable=False
    )
    prepared_at = Column(String(100), nullable=False)
    temperature_at_packaging = Column(Float, nullable=False, doc="Celsius at packing (hot holding >=60 or cold <=8)")
    is_hygienically_packed = Column(Boolean, default=True, nullable=False)
    is_plate_leftover = Column(Boolean, default=False, nullable=False, doc="Strict invariant: must always be False")
    expiry_deadline = Column(String(100), nullable=False, doc="ISO timestamp of safety window expiration")
    status = Column(
        Enum(DonationStatus, native_enum=False, length=20),
        default=DonationStatus.AVAILABLE,
        nullable=False,
        index=True
    )
    claimed_by_ngo_id = Column(String(64), ForeignKey("ngo_partners.id", ondelete="SET NULL"), nullable=True, index=True)
    claimed_by_ngo_name = Column(String(255), nullable=True)
    claimed_at = Column(String(100), nullable=True)
    pickup_pin_hash = Column(String(255), nullable=False, doc="Cryptographic bcrypt hash of 4-digit pickup PIN")
    completed_at = Column(String(100), nullable=True)
    kitchen_facility = Column(String(255), nullable=False)
    pickup_location = Column(String(255), nullable=False)
    beneficiary_target = Column(String(255), nullable=False)
    image_url = Column(String(1024), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    claimed_by_ngo = relationship("NgoPartner", back_populates="donations", foreign_keys=[claimed_by_ngo_id])

    __table_args__ = (
        CheckConstraint("total_quantity_kg > 0", name="ck_donation_positive_quantity"),
        CheckConstraint("servings_count > 0", name="ck_donation_positive_servings"),
        # Strict food safety policy: plate leftovers are barred from redistribution
        CheckConstraint("is_plate_leftover = 0 OR is_plate_leftover = false", name="ck_never_plate_leftover"),
    )

    def __repr__(self) -> str:
        return f"<SurplusDonation {self.id}: {self.food_title} ({self.status})>"
