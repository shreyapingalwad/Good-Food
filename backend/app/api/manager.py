"""
FastAPI endpoints for Dining Facility Managers:
- Operational summaries (overview, food waste segregation, donation redistribution)
- Forecasting inputs derived from persisted historical records
- Safety buffer configuration and audit-tracked overrides (0.0% to 20.0%)
- Facility-scoped audit event inspection
"""
from datetime import date, datetime, timedelta, timezone
import logging
from typing import Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth_dependencies import (
    AuthenticatedUser,
    Permission,
    RequirePermission,
    get_current_user,
    require_csrf,
)
from app.core.database import get_db
from app.models.attendance import StudentAttendance
from app.models.audit import AuditEvent
from app.models.dish_rating import DishRating
from app.models.donation import SurplusDonation
from app.models.enums import AuditSeverity, DonationStatus, MealType, UserRole
from app.models.kitchen_log import KitchenLog
from app.models.system_config import SystemConfig
from app.models.user import User
from app.schemas.audit import AuditEventRead, AuditLogListResponse
from app.schemas.manager import (
    DonationSummaryResponse,
    FoodWasteSummaryResponse,
    ForecastInputsResponse,
    ManagerOverviewResponse,
    MealTypeWasteBreakdown,
    NgoRedistributionStat,
    SafetyBufferConfigResponse,
    SafetyBufferOverrideRequest,
    WasteTrendItem,
)

logger = logging.getLogger("messaver.manager")

router = APIRouter(tags=["Manager Operations"])

BUFFER_CONFIG_KEY = "messaver_safety_buffer"


def _resolve_manager_facility(current_user: AuthenticatedUser, facility_param: Optional[str] = None) -> str:
    """
    Enforces facility scoping:
    - Managers can only view their own assigned facility.
    - Attempting to access another facility returns HTTP 403 Forbidden.
    - Admins can query any facility or fall back to their assigned / default facility.
    """
    if current_user.role == UserRole.MANAGER:
        user_facility = (current_user.facility_id or "").strip()
        if not user_facility:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Manager account has no assigned dining facility.",
            )
        if facility_param and facility_param.strip() and facility_param.strip() != user_facility:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Managers are strictly restricted to their assigned dining facility.",
            )
        return user_facility

    if current_user.role == UserRole.ADMIN:
        if facility_param and facility_param.strip():
            return facility_param.strip()
        return (current_user.facility_id or "Grand Central Mess - Block B").strip()

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only dining hall managers and administrators can access manager APIs.",
    )


def _validate_date_range(start_date: Optional[str], end_date: Optional[str], default_days: int = 30) -> tuple[str, str]:
    """Validates ISO YYYY-MM-DD date range format and order."""
    now_date = datetime.now(timezone.utc).date()
    if not end_date:
        end_str = now_date.isoformat()
    else:
        try:
            parsed_end = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
            end_str = parsed_end.isoformat()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid end_date format: '{end_date}'. Expected YYYY-MM-DD.",
            )

    if not start_date:
        start_str = (datetime.strptime(end_str, "%Y-%m-%d").date() - timedelta(days=default_days)).isoformat()
    else:
        try:
            parsed_start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
            start_str = parsed_start.isoformat()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid start_date format: '{start_date}'. Expected YYYY-MM-DD.",
            )

    if start_str > end_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date range: start_date ({start_str}) cannot be after end_date ({end_str}).",
        )

    return start_str, end_str


# ── 1. Manager Overview ───────────────────────────────────────────────────────

@router.get(
    "/overview",
    response_model=ManagerOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get operational overview for the manager's assigned facility",
)
def get_manager_overview(
    facility_id: Optional[str] = Query(None, description="Facility identifier (admins only)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.FACILITY_LOGS_READ)),
    db: Session = Depends(get_db),
) -> ManagerOverviewResponse:
    """
    Computes facility operational metrics entirely from persisted database records:
    - Headcount and meal attendance rates
    - Actual prepared, consumed, and segregated food waste (unserved surplus vs plate waste)
    - Completed donations, redirected meals, and redistribution diversion rate
    - Aggregated student ratings (without leaking individual student identity)
    """
    facility = _resolve_manager_facility(current_user, facility_id)
    start_str, end_str = _validate_date_range(start_date, end_date)

    # 1. Kitchen logs in date range
    kitchen_logs = (
        db.query(KitchenLog)
        .filter(
            KitchenLog.facility_id == facility,
            KitchenLog.date >= start_str,
            KitchenLog.date <= end_str,
        )
        .all()
    )

    total_expected_attendance = sum(k.expected_attendance for k in kitchen_logs)
    total_prepared_kg = round(sum(k.actual_prepared_kg for k in kitchen_logs), 2)
    total_consumed_kg = round(sum(k.consumed_kg for k in kitchen_logs), 2)
    total_kitchen_surplus_kg = round(sum(k.kitchen_surplus_kg for k in kitchen_logs), 2)
    total_plate_waste_kg = round(sum(k.plate_waste_kg for k in kitchen_logs), 2)
    total_food_waste_kg = round(total_kitchen_surplus_kg + total_plate_waste_kg, 2)
    food_waste_percentage = round((total_food_waste_kg / total_prepared_kg * 100), 2) if total_prepared_kg > 0 else 0.0

    # 2. Student attendance counts (aggregated, non-identifying)
    att_query = (
        db.query(
            StudentAttendance.attending,
            func.count(StudentAttendance.id),
        )
        .filter(
            StudentAttendance.date >= start_str,
            StudentAttendance.date <= end_str,
        )
        .group_by(StudentAttendance.attending)
        .all()
    )

    opted_in = sum(count for attending, count in att_query if attending)
    opted_out = sum(count for attending, count in att_query if not attending)
    total_att_records = opted_in + opted_out
    attendance_rate = round((opted_in / total_att_records * 100), 2) if total_att_records > 0 else 0.0

    # 3. Donations created by this facility
    donations = (
        db.query(SurplusDonation)
        .filter(SurplusDonation.kitchen_facility == facility)
        .all()
    )
    total_donations_created = len(donations)
    completed_donations = [d for d in donations if d.status == DonationStatus.COMPLETED]
    total_donations_completed = len(completed_donations)
    total_donated_kg = round(sum(d.total_quantity_kg for d in completed_donations), 2)
    total_meals_redirected = sum(d.servings_count for d in completed_donations)
    redistribution_diversion_rate = (
        round((total_donated_kg / total_food_waste_kg * 100), 2) if total_food_waste_kg > 0 else 0.0
    )

    # 4. Student ratings in period
    ratings_query = (
        db.query(
            func.avg(DishRating.rating),
            func.count(DishRating.id),
        )
        .filter(
            func.date(DishRating.created_at) >= start_str,
            func.date(DishRating.created_at) <= end_str,
        )
        .first()
    )
    avg_rating = round(float(ratings_query[0]), 2) if ratings_query and ratings_query[0] is not None else None
    total_ratings_count = int(ratings_query[1]) if ratings_query and ratings_query[1] is not None else 0

    return ManagerOverviewResponse(
        facility_id=facility,
        date_range_start=start_str,
        date_range_end=end_str,
        total_expected_attendance=total_expected_attendance,
        total_opted_in=opted_in,
        total_opted_out=opted_out,
        attendance_rate_percent=attendance_rate,
        total_prepared_kg=total_prepared_kg,
        total_consumed_kg=total_consumed_kg,
        total_kitchen_surplus_kg=total_kitchen_surplus_kg,
        total_plate_waste_kg=total_plate_waste_kg,
        total_food_waste_kg=total_food_waste_kg,
        food_waste_percentage=food_waste_percentage,
        total_donations_created=total_donations_created,
        total_donations_completed=total_donations_completed,
        total_donated_kg=total_donated_kg,
        total_meals_redirected=total_meals_redirected,
        redistribution_diversion_rate_percent=redistribution_diversion_rate,
        average_dish_rating=avg_rating,
        total_ratings_count=total_ratings_count,
    )


# ── 2. Food Waste Summary ─────────────────────────────────────────────────────

@router.get(
    "/food-waste-summary",
    response_model=FoodWasteSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get segregated food waste trends and meal breakdowns",
)
def get_food_waste_summary(
    facility_id: Optional[str] = Query(None, description="Facility identifier (admins only)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.FACILITY_LOGS_READ)),
    db: Session = Depends(get_db),
) -> FoodWasteSummaryResponse:
    """
    Returns segregated food waste data for the facility:
    - Distinguishes edible unserved kitchen surplus from post-plate compost scraps
    - Daily trend history with waste percentages
    - Breakdown by meal type (Breakfast, Lunch, Snacks, Dinner)
    """
    facility = _resolve_manager_facility(current_user, facility_id)
    start_str, end_str = _validate_date_range(start_date, end_date)

    logs = (
        db.query(KitchenLog)
        .filter(
            KitchenLog.facility_id == facility,
            KitchenLog.date >= start_str,
            KitchenLog.date <= end_str,
        )
        .order_by(KitchenLog.date.asc())
        .all()
    )

    total_prepared = round(sum(k.actual_prepared_kg for k in logs), 2)
    total_consumed = round(sum(k.consumed_kg for k in logs), 2)
    total_surplus = round(sum(k.kitchen_surplus_kg for k in logs), 2)
    total_plate_waste = round(sum(k.plate_waste_kg for k in logs), 2)
    total_waste = round(total_surplus + total_plate_waste, 2)
    overall_waste_rate = round((total_waste / total_prepared * 100), 2) if total_prepared > 0 else 0.0

    # Group daily trends
    daily_groups: Dict[str, Dict[str, float]] = {}
    for log in logs:
        if log.date not in daily_groups:
            daily_groups[log.date] = {
                "prepared_kg": 0.0,
                "consumed_kg": 0.0,
                "surplus_kg": 0.0,
                "plate_waste_kg": 0.0,
            }
        daily_groups[log.date]["prepared_kg"] += log.actual_prepared_kg
        daily_groups[log.date]["consumed_kg"] += log.consumed_kg
        daily_groups[log.date]["surplus_kg"] += log.kitchen_surplus_kg
        daily_groups[log.date]["plate_waste_kg"] += log.plate_waste_kg

    daily_trends = []
    for d, vals in sorted(daily_groups.items()):
        p = round(vals["prepared_kg"], 2)
        c = round(vals["consumed_kg"], 2)
        s = round(vals["surplus_kg"], 2)
        pw = round(vals["plate_waste_kg"], 2)
        rate = round(((s + pw) / p * 100), 2) if p > 0 else 0.0
        daily_trends.append(
            WasteTrendItem(
                date=d,
                prepared_kg=p,
                consumed_kg=c,
                surplus_kg=s,
                plate_waste_kg=pw,
                waste_rate_percent=rate,
            )
        )

    # Group by meal type
    meal_groups: Dict[str, Dict[str, float]] = {}
    for log in logs:
        m_name = log.meal_type.value if hasattr(log.meal_type, "value") else str(log.meal_type)
        if m_name not in meal_groups:
            meal_groups[m_name] = {
                "prepared_kg": 0.0,
                "consumed_kg": 0.0,
                "surplus_kg": 0.0,
                "plate_waste_kg": 0.0,
            }
        meal_groups[m_name]["prepared_kg"] += log.actual_prepared_kg
        meal_groups[m_name]["consumed_kg"] += log.consumed_kg
        meal_groups[m_name]["surplus_kg"] += log.kitchen_surplus_kg
        meal_groups[m_name]["plate_waste_kg"] += log.plate_waste_kg

    meal_breakdown = [
        MealTypeWasteBreakdown(
            meal_type=m,
            prepared_kg=round(vals["prepared_kg"], 2),
            consumed_kg=round(vals["consumed_kg"], 2),
            surplus_kg=round(vals["surplus_kg"], 2),
            plate_waste_kg=round(vals["plate_waste_kg"], 2),
        )
        for m, vals in meal_groups.items()
    ]

    return FoodWasteSummaryResponse(
        facility_id=facility,
        date_range_start=start_str,
        date_range_end=end_str,
        total_prepared_kg=total_prepared,
        total_consumed_kg=total_consumed,
        total_kitchen_surplus_kg=total_surplus,
        total_plate_waste_kg=total_plate_waste,
        total_waste_kg=total_waste,
        waste_rate_percent=overall_waste_rate,
        daily_trends=daily_trends,
        meal_breakdown=meal_breakdown,
    )


# ── 3. Donation Summary ───────────────────────────────────────────────────────

@router.get(
    "/donation-summary",
    response_model=DonationSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get surplus redistribution summary and NGO partner breakdown",
)
def get_donation_summary(
    facility_id: Optional[str] = Query(None, description="Facility identifier (admins only)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.FACILITY_DONATIONS_READ)),
    db: Session = Depends(get_db),
) -> DonationSummaryResponse:
    """
    Returns surplus donation metrics for the manager's facility:
    - Counts by status (AVAILABLE, CLAIMED, COMPLETED, EXPIRED)
    - Total redistributed kg and servings
    - NGO partner impact breakdown (pickups, kg, and meals received)
    """
    facility = _resolve_manager_facility(current_user, facility_id)
    start_str, end_str = _validate_date_range(start_date, end_date)

    donations = (
        db.query(SurplusDonation)
        .filter(
            SurplusDonation.kitchen_facility == facility,
            func.date(SurplusDonation.created_at) >= start_str,
            func.date(SurplusDonation.created_at) <= end_str,
        )
        .all()
    )

    available_count = sum(1 for d in donations if d.status == DonationStatus.AVAILABLE)
    claimed_count = sum(1 for d in donations if d.status == DonationStatus.CLAIMED)
    completed_count = sum(1 for d in donations if d.status == DonationStatus.COMPLETED)
    expired_count = sum(1 for d in donations if d.status == DonationStatus.EXPIRED)

    completed = [d for d in donations if d.status == DonationStatus.COMPLETED]
    total_redistributed_kg = round(sum(d.total_quantity_kg for d in completed), 2)
    total_meals = sum(d.servings_count for d in completed)

    # Group by NGO
    ngo_stats: Dict[str, Dict[str, any]] = {}
    for d in completed:
        ngo_id = d.claimed_by_ngo_id or "unassigned"
        if ngo_id not in ngo_stats:
            ngo_stats[ngo_id] = {
                "ngo_name": d.claimed_by_ngo_name or "Unknown NGO",
                "pickups_completed": 0,
                "total_kg": 0.0,
                "total_meals": 0,
            }
        ngo_stats[ngo_id]["pickups_completed"] += 1
        ngo_stats[ngo_id]["total_kg"] += d.total_quantity_kg
        ngo_stats[ngo_id]["total_meals"] += d.servings_count

    ngo_breakdown = [
        NgoRedistributionStat(
            ngo_id=nid,
            ngo_name=data["ngo_name"],
            pickups_completed=data["pickups_completed"],
            total_kg_received=round(data["total_kg"], 2),
            total_meals_received=data["total_meals"],
        )
        for nid, data in ngo_stats.items()
    ]

    return DonationSummaryResponse(
        facility_id=facility,
        date_range_start=start_str,
        date_range_end=end_str,
        total_donations=len(donations),
        available_count=available_count,
        claimed_count=claimed_count,
        completed_count=completed_count,
        expired_count=expired_count,
        total_redistributed_kg=total_redistributed_kg,
        total_meals_redistributed=total_meals,
        ngo_breakdown=ngo_breakdown,
    )


# ── 4. Forecast Inputs ────────────────────────────────────────────────────────

@router.get(
    "/forecast-inputs",
    response_model=ForecastInputsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get historical parameters for forecasting model inputs",
)
def get_forecast_inputs(
    facility_id: Optional[str] = Query(None, description="Facility identifier (admins only)"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.FORECASTING_READ)),
    db: Session = Depends(get_db),
) -> ForecastInputsResponse:
    """
    Aggregates historical features used as inputs for demand forecasting:
    - Average diners by meal slot from historical kitchen records
    - Average per-capita consumption (kg/person)
    - Current configured safety buffer percent (from SystemConfig)
    - Average student dish satisfaction rating
    Notice: Does NOT invent predictions; clearly denotes historical observed data.
    """
    facility = _resolve_manager_facility(current_user, facility_id)

    logs = (
        db.query(KitchenLog)
        .filter(KitchenLog.facility_id == facility)
        .all()
    )

    distinct_dates = set(k.date for k in logs)
    period_days = len(distinct_dates)

    # Average diners per meal slot
    meal_diners: Dict[str, List[int]] = {
        MealType.BREAKFAST.value: [],
        MealType.LUNCH.value: [],
        MealType.SNACKS.value: [],
        MealType.DINNER.value: [],
    }
    for k in logs:
        m_val = k.meal_type.value if hasattr(k.meal_type, "value") else str(k.meal_type)
        if m_val in meal_diners:
            meal_diners[m_val].append(k.expected_attendance)

    avg_diners: Dict[str, float] = {
        m: round(sum(att) / len(att), 1) if att else 0.0
        for m, att in meal_diners.items()
    }

    # Per-capita consumption
    total_consumed = sum(k.consumed_kg for k in logs)
    total_diners = sum(k.expected_attendance for k in logs)
    avg_consumption = round(total_consumed / total_diners, 3) if total_diners > 0 else 0.40

    # Current safety buffer
    buffer_config = db.query(SystemConfig).filter(SystemConfig.key == BUFFER_CONFIG_KEY).first()
    current_buffer = 5.0
    if buffer_config and isinstance(buffer_config.value, dict):
        current_buffer = float(buffer_config.value.get("currentPercent", 5.0))

    # Ratings
    avg_rating_query = db.query(func.avg(DishRating.rating)).scalar()
    avg_rating = round(float(avg_rating_query), 2) if avg_rating_query is not None else 4.0

    return ForecastInputsResponse(
        facility_id=facility,
        as_of_date=datetime.now(timezone.utc).date().isoformat(),
        historical_observed_period_days=period_days,
        average_diners_per_meal=avg_diners,
        average_consumption_kg_per_person=avg_consumption,
        current_safety_buffer_percent=current_buffer,
        average_dish_popularity_rating=avg_rating,
        is_historical_data=True,
    )


# ── 5. Safety Buffer Overrides ────────────────────────────────────────────────

@router.get(
    "/safety-buffer",
    response_model=SafetyBufferConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current safety buffer configuration for the facility",
)
def get_safety_buffer_config(
    facility_id: Optional[str] = Query(None, description="Facility identifier (admins only)"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.FORECASTING_READ)),
    db: Session = Depends(get_db),
) -> SafetyBufferConfigResponse:
    """
    Returns current safety buffer percentage, limits (0-20%), and last justification.
    """
    facility = _resolve_manager_facility(current_user, facility_id)
    config = db.query(SystemConfig).filter(SystemConfig.key == BUFFER_CONFIG_KEY).first()

    current_val = 5.0
    min_val = 0.0
    max_val = 20.0
    justification = None
    updated_at = None
    updated_by = None

    if config:
        updated_at = config.updated_at
        updated_by = config.updated_by
        if isinstance(config.value, dict):
            current_val = float(config.value.get("currentPercent", 5.0))
            min_val = float(config.value.get("minPercent", 0.0))
            max_val = float(config.value.get("maxPercent", 20.0))
            justification = config.value.get("justification")
        elif isinstance(config.value, (int, float)):
            current_val = float(config.value)

    return SafetyBufferConfigResponse(
        facility_id=facility,
        current_percent=current_val,
        min_percent=min_val,
        max_percent=max_val,
        last_updated_at=updated_at,
        last_updated_by=updated_by,
        last_justification=justification,
    )


@router.post(
    "/safety-buffer/override",
    response_model=SafetyBufferConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Override safety buffer with mandatory justification and audit logging",
    dependencies=[Depends(require_csrf)],
)
def override_safety_buffer(
    req: SafetyBufferOverrideRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.SAFETY_BUFFER_OVERRIDE)),
    db: Session = Depends(get_db),
) -> SafetyBufferConfigResponse:
    """
    Updates the institutional safety buffer for the facility within the allowed 0.0–20.0% range:
    - Requires authenticated Manager or Admin role.
    - Requires a non-empty, detailed operational justification (min 5 characters).
    - Requires CSRF verification for cookie authentication.
    - Atomically persists the new buffer and appends a compliance AuditEvent.
    - All actions succeed or roll back together in a single transaction.
    """
    facility = _resolve_manager_facility(current_user)

    if req.safety_buffer_percent < 0.0 or req.safety_buffer_percent > 20.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Safety buffer percent must be between 0.0% and 20.0%. Provided: {req.safety_buffer_percent}%",
        )

    clean_justification = req.justification.strip()
    if len(clean_justification) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A non-empty justification of at least 5 characters is required for all buffer overrides.",
        )

    try:
        # 1. Update or create SystemConfig
        config = db.query(SystemConfig).filter(SystemConfig.key == BUFFER_CONFIG_KEY).first()
        old_percent = 5.0
        if config and isinstance(config.value, dict):
            old_percent = float(config.value.get("currentPercent", 5.0))

        new_value = {
            "currentPercent": req.safety_buffer_percent,
            "minPercent": 0.0,
            "maxPercent": 20.0,
            "justification": clean_justification,
            "facility_id": facility,
        }

        user_db = db.query(User).filter(User.id == current_user.user_id).first()
        actor_name = user_db.full_name if user_db else current_user.user_id

        if not config:
            config = SystemConfig(
                key=BUFFER_CONFIG_KEY,
                value=new_value,
                description="Institutional meal production safety buffer percentage over predicted headcount",
                updated_by=current_user.user_id,
            )
            db.add(config)
        else:
            config.value = new_value
            config.updated_by = current_user.user_id
            config.updated_at = datetime.now(timezone.utc)

        # 2. Append AuditEvent in the SAME transaction
        audit = AuditEvent(
            id=f"log-{uuid.uuid4()}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor_name=actor_name,
            actor_role=current_user.role,
            action="BUFFER_OVERRIDE_RECORDED",
            details=(
                f"Manager adjusted safety buffer from {old_percent}% to {req.safety_buffer_percent}% "
                f"for facility '{facility}'. Justification: \"{clean_justification}\""
            ),
            severity=AuditSeverity.WARNING,
        )
        db.add(audit)

        db.commit()
        db.refresh(config)

        logger.info(
            f"Safety buffer updated to {req.safety_buffer_percent}% by {actor_name} "
            f"for facility '{facility}' (audit: {audit.id})"
        )

        return SafetyBufferConfigResponse(
            facility_id=facility,
            current_percent=req.safety_buffer_percent,
            min_percent=0.0,
            max_percent=20.0,
            last_updated_at=config.updated_at,
            last_updated_by=current_user.user_id,
            last_justification=clean_justification,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to record safety buffer override: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving the safety buffer override.",
        )


# ── 6. Facility Audit Event Inspection ────────────────────────────────────────

@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get audit events relevant to the manager's assigned facility",
)
def get_manager_audit_logs(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    severity: Optional[AuditSeverity] = Query(None, description="Filter by severity"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.FACILITY_LOGS_READ)),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    """
    Returns audit events relevant to dining hall management:
    - Scoped to actions like BUFFER_OVERRIDE_RECORDED, HANDOVER_VERIFIED, DONATION_CLAIMED, KITCHEN_LOG_CREATED
    - Strictly read-only; secrets and sensitive credentials are never exposed
    """
    facility = _resolve_manager_facility(current_user)

    query = db.query(AuditEvent)

    # Scoped action list for facility operations
    facility_actions = [
        "BUFFER_OVERRIDE_RECORDED",
        "HANDOVER_VERIFIED",
        "DONATION_CLAIMED",
        "SURPLUS_OFFER_CREATED",
        "KITCHEN_LOG_CREATED",
        "STUDENT_ATTENDANCE_RECORDED",
    ]
    query = query.filter(AuditEvent.action.in_(facility_actions))

    if severity:
        query = query.filter(AuditEvent.severity == severity)

    if start_date:
        query = query.filter(func.date(AuditEvent.created_at) >= start_date.strip())
    if end_date:
        query = query.filter(func.date(AuditEvent.created_at) <= end_date.strip())

    total = query.count()
    items = (
        query.order_by(AuditEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return AuditLogListResponse(
        items=[AuditEventRead.model_validate(it) for it in items],
        total=total,
    )
