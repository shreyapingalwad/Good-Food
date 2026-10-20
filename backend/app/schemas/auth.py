"""
Pydantic schemas for authentication and authorization.
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import UserRole


class LoginRequest(BaseModel):
    """
    Credentials submitted for authentication.
    Accepts either username or email as the identifier.
    """
    identifier: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Username or email address",
    )
    password: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="User password",
    )


class CurrentUserResponse(BaseModel):
    """
    Safe public user profile returned upon authentication and on /auth/me.
    Never includes password hashes, session tokens, or sensitive internal IDs.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    full_name: str
    role: UserRole
    facility_id: Optional[str] = None
    ngo_id: Optional[str] = None
    permissions: list[str] = Field(
        default_factory=list,
        description="Explicit list of granted permissions based on role",
    )
    csrf_token: str = Field(
        ...,
        description="CSRF token for state-changing operations",
    )


class LoginResponse(BaseModel):
    """Response returned upon successful authentication."""
    message: str = "Login successful"
    user: CurrentUserResponse


class LogoutResponse(BaseModel):
    """Response returned upon session termination."""
    message: str = "Logged out successfully"


class PinRecoveryRequest(BaseModel):
    """Staff request to reset or rotate a locked donation pickup PIN."""
    reason: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Audit justification for resetting or rotating the donation PIN",
    )
    rotate_pin: bool = Field(
        default=False,
        description="Whether to generate and assign a new random 4-digit PIN",
    )


class PinRecoveryResponse(BaseModel):
    """Response to authorized PIN recovery action."""
    message: str
    donation_id: str
    new_pin: Optional[str] = Field(
        default=None,
        description="New 4-digit PIN if rotation was requested; otherwise None",
    )
    unlocked: bool = True


class SessionCleanupResponse(BaseModel):
    """Response to session cleanup operation."""
    message: str
    deactivated_sessions_count: int
