"""
Surplus Food Donation API endpoints:
- POST /api/v1/surplus: Create surplus donation offer with secure PIN generation and audit event
- GET /api/v1/surplus/me: Retrieve facility-scoped donation offers for kitchen & managers
- GET /api/v1/surplus/available: Retrieve active available offers for operational roles (NGO, Kitchen, Manager, Admin)
"""
from datetime import datetime, timezone
import logging
import secrets
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth_dependencies import (
    AuthenticatedUser,
    Permission,
    RequirePermission,
    get_current_user,
    require_csrf,
)
from app.core.database import get_db
from app.core.pin_security import hash_pickup_pin
from app.models.audit import AuditEvent
from app.models.donation import SurplusDonation
from app.models.enums import AuditSeverity, DonationStatus, UserRole
from app.models.user import User
from app.schemas.donation import (
    SurplusDonationCreateRequest,
    SurplusDonationCreateResponse,
    SurplusDonationListResponse,
    SurplusDonationRead,
)

logger = logging.getLogger("messaver.api.surplus")

router = APIRouter(tags=["Surplus Food Redistribution"])


def _require_facility_surplus_access(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Enforces that only kitchen staff, managers, or admins can view facility surplus offers."""
    if current_user.role not in {UserRole.KITCHEN, UserRole.MANAGER, UserRole.ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view facility surplus offers.",
        )
    return current_user


def _require_available_surplus_access(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Enforces that operational roles (NGOs, Kitchen, Managers, Admins) can view available offers."""
    if current_user.role not in {UserRole.NGO, UserRole.KITCHEN, UserRole.MANAGER, UserRole.ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view available surplus offers.",
        )
    return current_user


@router.post(
    "",
    response_model=SurplusDonationCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a surplus food donation offer",
    dependencies=[Depends(require_csrf)],
)
def create_surplus_donation(
    req: SurplusDonationCreateRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.SURPLUS_CREATE)),
    db: Session = Depends(get_db),
) -> SurplusDonationCreateResponse:
    """
    Creates an edible surplus food donation offer:
    - Only authorized kitchen staff (or admins) can create offers.
    - Facility is derived strictly from the server-validated session.
    - Strict Food Safety: rejects plate leftovers (is_plate_leftover=False required).
    - Temperature control: packaging temperature must be >= 60°C or <= 8°C.
    - Expiry deadline: must be a valid future ISO timestamp.
    - Generates cryptographic pickup PIN hash (bcrypt + server pepper).
    - One-time plaintext PIN is returned in the response for supervisor handover to collector.
    - Plaintext PIN is NEVER saved to database or printed in logs.
    - An immutable audit trail event is committed in the same atomic transaction.
    """
    # 1. Facility scoping
    if not current_user.facility_id or not current_user.facility_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned kitchen facility.",
        )
    kitchen_facility = current_user.facility_id.strip()

    # 2. Strict Food Safety Validation
    if req.is_plate_leftover:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Food Safety Policy Violation: Customer plate leftovers strictly barred from human consumption redistribution.",
        )

    if 8.0 < req.temperature_at_packaging < 60.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Critical Temperature Warning ({req.temperature_at_packaging}°C): "
                f"Food must be hot-held (>= 60°C) or rapid-chilled (<= 8°C) before safe packing."
            ),
        )

    # 3. Expiry deadline validation
    try:
        clean_deadline = req.expiry_deadline.replace("Z", "+00:00")
        exp_dt = datetime.fromisoformat(clean_deadline)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        if exp_dt <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expiry deadline must be in the future.",
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ISO format for expiry_deadline.",
        )

    # 4. Generate unique donation ID
    donation_id = f"DON-{secrets.randbelow(9000) + 1000}"
    # Prevent collision if ID exists
    while db.query(SurplusDonation).filter(SurplusDonation.id == donation_id).first():
        donation_id = f"DON-{secrets.randbelow(90000) + 10000}"

    # 5. Generate secure 4-digit pickup PIN and hash with server-side pepper
    plain_pin = f"{secrets.randbelow(9000) + 1000}"
    pin_hash = hash_pickup_pin(plain_pin, donation_id)

    # 6. Fetch supervisor full name
    user = db.query(User).filter(User.id == current_user.user_id).first()
    actor_name = user.full_name if user else current_user.user_id

    # 7. Convert dishes Pydantic models to dicts for JSON column
    dishes_data = [d.model_dump() for d in req.dishes]

    try:
        new_donation = SurplusDonation(
            id=donation_id,
            food_title=req.food_title,
            dishes=dishes_data,
            total_quantity_kg=req.total_quantity_kg,
            servings_count=req.servings_count,
            meal_type=req.meal_type,
            prepared_at=req.prepared_at,
            temperature_at_packaging=req.temperature_at_packaging,
            is_hygienically_packed=req.is_hygienically_packed,
            is_plate_leftover=False,
            expiry_deadline=req.expiry_deadline,
            status=DonationStatus.AVAILABLE,
            pickup_pin_hash=pin_hash,
            kitchen_facility=kitchen_facility,
            pickup_location=req.pickup_location,
            beneficiary_target=req.beneficiary_target,
            image_url=req.image_url,
        )
        db.add(new_donation)

        # Audit event created atomically
        audit = AuditEvent(
            id=f"log-{uuid.uuid4()}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor_name=actor_name,
            actor_role=current_user.role,
            action="SURPLUS_OFFERED",
            details=(
                f"Created donation offer #{donation_id} ({req.total_quantity_kg}kg, "
                f"~{req.servings_count} portions) at {kitchen_facility}. "
                f"Temperature verified at {req.temperature_at_packaging}°C. Plate leftovers check: Zero (Passed)."
            ),
            severity=AuditSeverity.SUCCESS,
        )
        db.add(audit)
        db.flush()
        db.commit()

        logger.info(
            f"Created surplus donation '{donation_id}' at {kitchen_facility} "
            f"({req.total_quantity_kg}kg, {req.servings_count} servings)"
        )

        response_dict = SurplusDonationRead.model_validate(new_donation).model_dump()
        response_dict["pickup_pin"] = plain_pin
        return SurplusDonationCreateResponse(**response_dict)
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to create surplus donation offer: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to create surplus donation offer: {str(exc)}",
        )


@router.get(
    "/me",
    response_model=SurplusDonationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get donation offers created by authenticated user's facility",
)
def get_my_facility_donations(
    status_filter: Optional[DonationStatus] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(_require_facility_surplus_access),
    db: Session = Depends(get_db),
) -> SurplusDonationListResponse:
    """
    Returns donation offers for the authenticated user's assigned facility:
    - Kitchen staff and managers only see their own facility's offers.
    - Admins see all or their assigned facility.
    - Strict Security: Plaintext PIN and pin hash are NEVER returned.
    """
    if not current_user.facility_id or not current_user.facility_id.strip():
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no assigned facility.",
            )
        facility_id = "Grand Central Mess - Block B"
    else:
        facility_id = current_user.facility_id.strip()

    query = db.query(SurplusDonation).filter(SurplusDonation.kitchen_facility == facility_id)

    if status_filter:
        query = query.filter(SurplusDonation.status == status_filter)

    total = query.count()
    items = (
        query.order_by(SurplusDonation.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return SurplusDonationListResponse(
        items=[SurplusDonationRead.model_validate(i) for i in items],
        total=total,
    )


@router.get(
    "/available",
    response_model=SurplusDonationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get currently available surplus donation offers for human consumption",
)
def get_available_donations(
    facility_id: Optional[str] = Query(None, description="Filter by facility"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(_require_available_surplus_access),
    db: Session = Depends(get_db),
) -> SurplusDonationListResponse:
    """
    Returns all active donation offers with status AVAILABLE:
    - Accessible to operational roles: NGOs, Kitchen staff, Managers, and Admins.
    - Students are strictly forbidden (403).
    - Strict Security: Plaintext PIN and pin hash are NEVER returned.
    """
    query = db.query(SurplusDonation).filter(SurplusDonation.status == DonationStatus.AVAILABLE)

    if facility_id:
        query = query.filter(SurplusDonation.kitchen_facility == facility_id.strip())

    total = query.count()
    items = (
        query.order_by(SurplusDonation.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return SurplusDonationListResponse(
        items=[SurplusDonationRead.model_validate(i) for i in items],
        total=total,
    )
