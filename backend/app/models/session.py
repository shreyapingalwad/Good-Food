"""
Server-side session model.
Sessions are stored in the database with indexed lookup by token hash,
automatic expiry tracking, and user association.
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, func
from app.models.base import Base


class ServerSession(Base):
    """
    Secure server-side session record.
    The session token is stored as an HMAC-SHA256 hash to prevent session hijacking
    from a database leak. The plaintext token only lives in the HttpOnly cookie.
    """
    __tablename__ = "server_sessions"

    id = Column(String(64), primary_key=True, doc="UUID session identifier")
    token_hash = Column(
        String(128), unique=True, nullable=False, index=True,
        doc="HMAC-SHA256 hash of the opaque session token. Plaintext is never stored."
    )
    user_id = Column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    user_role = Column(String(32), nullable=False)
    user_facility_id = Column(String(100), nullable=True)
    user_ngo_id = Column(String(64), nullable=True)

    ip_address = Column(String(45), nullable=True, doc="Client IP at session creation")
    user_agent = Column(String(512), nullable=True, doc="Truncated User-Agent header")

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_sessions_active_expires", "is_active", "expires_at"),
    )

    def __repr__(self) -> str:
        return f"<ServerSession {self.id} user={self.user_id} active={self.is_active}>"
