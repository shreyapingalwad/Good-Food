from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enums import UserRole


class User(Base):
    """
    Users and Role Assignments.
    Supports student, kitchen, manager, ngo, and admin roles.
    Never stores plaintext passwords.
    """
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRole, native_enum=False, length=32),
        nullable=False,
        index=True
    )
    facility_id = Column(String(100), nullable=True, doc="Institutional dining facility or mess hall")
    ngo_id = Column(String(64), ForeignKey("ngo_partners.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    ngo = relationship("NgoPartner", back_populates="users", foreign_keys=[ngo_id])

    def __repr__(self) -> str:
        return f"<User {self.username} (role={self.role})>"
