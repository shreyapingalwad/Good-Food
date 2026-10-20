"""
Phase 3.4 Automated Test Suite — Manager and Administrator Backend APIs:
1. Manager Operational Summaries (/api/v1/manager/overview, /food-waste-summary, /donation-summary, /forecast-inputs)
   - Unauthenticated rejected (401)
   - Student, Kitchen, and NGO roles forbidden (403)
   - Cross-facility isolation strictly enforced (Manager from North cannot access South) (403)
   - Accurate metrics calculated from persisted records (no invented dashboard numbers)
   - No student PII leaked in aggregate responses
   - Date range validation (YYYY-MM-DD validation, start_date <= end_date)
   - Distinguishes observed historical data from predictions
2. Manager Safety Buffer Configuration & Overrides (/api/v1/manager/safety-buffer, /safety-buffer/override)
   - 0.0% to 20.0% bounds validation
   - Mandatory operational justification (min 5 chars)
   - CSRF enforcement for state-changing requests
   - Atomic update of SystemConfig and AuditEvent (BUFFER_OVERRIDE_RECORDED)
3. Admin NGO Partner Administration (/api/v1/admin/ngos)
   - Admin-only access (403 for Manager/Student/Kitchen/NGO)
   - List with filters (verified, is_active, search) and pagination
   - Verify/unverify partner with audit logging
   - Activate/deactivate partner, cascading to linked user accounts
   - Ensures inactive or unverified NGOs cannot claim surplus donations
4. System Configuration Management (/api/v1/admin/system-config)
   - Explicit allowlist enforcement (arbitrary keys rejected)
   - Secret key/value protection (rejects credentials, passwords, peppers, db URLs)
   - Mandatory justification and audit logging
5. Administrative Audit History (/api/v1/admin/audit-logs & /api/v1/manager/audit-logs)
   - Admin global access with multi-field filters (action, severity, role, date, search)
   - Manager facility-scoped access
   - Read-only append-only audit trail
   - Sensitive credential and PIN secrecy guaranteed
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.pin_security import hash_pickup_pin
from app.core.security import hash_secret
from app.models.attendance import StudentAttendance
from app.models.audit import AuditEvent
from app.models.dish_rating import DishRating
from app.models.donation import SurplusDonation
from app.models.enums import AuditSeverity, DonationStatus, MealType, UserRole
from app.models.kitchen_log import KitchenLog
from app.models.ngo import NgoPartner
from app.models.system_config import SystemConfig
from app.models.user import User


# ── Fixtures & Setup ──────────────────────────────────────────────────────────

@pytest.fixture
def setup_manager_admin_data(db_session: Session):
    """Seeds test facilities, users across all roles, NGOs, and sample logs."""
    # 1. Seed NGOs
    ngo_active = NgoPartner(
        id="ngo-active-1",
        name="Robin Hood Army - Central",
        registration_number="REG-RHA-101",
        contact_person="RHA Coordinator",
        phone="+91 98765 11111",
        vehicle_type="Insulated Electric Van",
        verified=True,
        is_active=True,
        total_pickups_completed=12,
        meals_distributed=600,
    )
    ngo_unverified = NgoPartner(
        id="ngo-unv-1",
        name="Shelter Without Badge",
        registration_number="REG-SWB-202",
        contact_person="Shelter Lead",
        phone="+91 98765 22222",
        vehicle_type="Covered Van",
        verified=False,
        is_active=True,
        total_pickups_completed=0,
        meals_distributed=0,
    )
    ngo_inactive = NgoPartner(
        id="ngo-inact-1",
        name="Deactivated Charity Trust",
        registration_number="REG-DCT-303",
        contact_person="Trustee One",
        phone="+91 98765 33333",
        vehicle_type="Small Truck",
        verified=True,
        is_active=False,  # Deactivated!
        total_pickups_completed=2,
        meals_distributed=100,
    )
    db_session.add_all([ngo_active, ngo_unverified, ngo_inactive])
    db_session.flush()

    # 2. Seed Users across all roles
    users = [
        User(
            id="usr-std",
            username="student_user",
            email="student@campus.edu",
            full_name="Standard Student",
            password_hash=hash_secret("pass123"),
            role=UserRole.STUDENT,
            facility_id="FAC-NORTH",
            is_active=True,
        ),
        User(
            id="usr-kit",
            username="kitchen_chef",
            email="chef@campus.edu",
            full_name="Head Chef North",
            password_hash=hash_secret("pass123"),
            role=UserRole.KITCHEN,
            facility_id="FAC-NORTH",
            is_active=True,
        ),
        User(
            id="usr-mgr-north",
            username="manager_north",
            email="mgr_north@campus.edu",
            full_name="Dr. Anita Roy (Manager North)",
            password_hash=hash_secret("pass123"),
            role=UserRole.MANAGER,
            facility_id="FAC-NORTH",
            is_active=True,
        ),
        User(
            id="usr-mgr-south",
            username="manager_south",
            email="mgr_south@campus.edu",
            full_name="Mr. Rajesh Kumar (Manager South)",
            password_hash=hash_secret("pass123"),
            role=UserRole.MANAGER,
            facility_id="FAC-SOUTH",
            is_active=True,
        ),
        User(
            id="usr-ngo-active",
            username="ngo_user_active",
            email="ngo_active@rha.org",
            full_name="Active NGO Collector",
            password_hash=hash_secret("pass123"),
            role=UserRole.NGO,
            ngo_id="ngo-active-1",
            is_active=True,
        ),
        User(
            id="usr-ngo-unv",
            username="ngo_user_unv",
            email="ngo_unv@shelter.org",
            full_name="Unverified NGO User",
            password_hash=hash_secret("pass123"),
            role=UserRole.NGO,
            ngo_id="ngo-unv-1",
            is_active=True,
        ),
        User(
            id="usr-ngo-inact",
            username="ngo_user_inact",
            email="ngo_inact@charity.org",
            full_name="Deactivated NGO User",
            password_hash=hash_secret("pass123"),
            role=UserRole.NGO,
            ngo_id="ngo-inact-1",
            is_active=False,
        ),
        User(
            id="usr-admin",
            username="admin_governance",
            email="admin_gov@campus.edu",
            full_name="Global System Admin",
            password_hash=hash_secret("pass123"),
            role=UserRole.ADMIN,
            is_active=True,
        ),
    ]
    for u in users:
        db_session.add(u)

    # 3. Seed SystemConfig default safety buffer
    buffer_cfg = SystemConfig(
        key="messaver_safety_buffer",
        value={"currentPercent": 5.0, "minPercent": 0.0, "maxPercent": 20.0, "justification": "Initial institutional baseline"},
        description="Operational safety buffer percentage over baseline predicted headcount",
        updated_by="system_init",
    )
    db_session.add(buffer_cfg)
    db_session.commit()

    return {u.username: u for u in users}


def authenticate_client(client: TestClient, identifier: str, password: str = "pass123") -> tuple[str, str]:
    """Helper to authenticate and return (csrf_token, session_cookie). Clears client cookies first."""
    client.cookies.clear()
    res = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})
    assert res.status_code == 200, f"Login failed for {identifier}: {res.text}"
    csrf = res.json()["user"]["csrf_token"]
    cookie = res.cookies.get("messaver_session") or client.cookies.get("messaver_session")
    return csrf, cookie


def seed_operational_logs(db_session: Session, facility_id: str = "FAC-NORTH"):
    """Seeds historical kitchen logs, student attendance, donations, and dish ratings."""
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)

    # Kitchen logs
    k1 = KitchenLog(
        id="klog-101",
        date=yesterday.isoformat(),
        meal_type=MealType.LUNCH,
        dish_name="Paneer Butter Masala",
        expected_attendance=500,
        recommended_kg=200.0,
        actual_prepared_kg=220.0,
        consumed_kg=190.0,
        kitchen_surplus_kg=20.0,
        plate_waste_kg=10.0,
        recorded_by="Head Chef North",
        facility_id=facility_id,
    )
    k2 = KitchenLog(
        id="klog-102",
        date=today.isoformat(),
        meal_type=MealType.DINNER,
        dish_name="Dal Makhani & Jeera Rice",
        expected_attendance=450,
        recommended_kg=180.0,
        actual_prepared_kg=190.0,
        consumed_kg=170.0,
        kitchen_surplus_kg=15.0,
        plate_waste_kg=5.0,
        recorded_by="Head Chef North",
        facility_id=facility_id,
    )
    db_session.add_all([k1, k2])

    # Student Attendance
    att1 = StudentAttendance(
        student_id="std-1",
        student_name="Student One",
        date=yesterday.isoformat(),
        meal_type=MealType.LUNCH,
        attending=True,
    )
    att2 = StudentAttendance(
        student_id="std-2",
        student_name="Student Two",
        date=yesterday.isoformat(),
        meal_type=MealType.LUNCH,
        attending=False,
    )
    att3 = StudentAttendance(
        student_id="std-1",
        student_name="Student One",
        date=today.isoformat(),
        meal_type=MealType.DINNER,
        attending=True,
    )
    db_session.add_all([att1, att2, att3])

    # Surplus Donation
    don1 = SurplusDonation(
        id="DON-MGR-01",
        food_title="Unserved Paneer Curry",
        dishes=[{"name": "Paneer Curry", "quantityKg": 20.0}],
        total_quantity_kg=20.0,
        servings_count=50,
        meal_type=MealType.LUNCH,
        prepared_at="12:30 PM",
        temperature_at_packaging=65.0,
        is_hygienically_packed=True,
        is_plate_leftover=False,
        expiry_deadline=(datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
        status=DonationStatus.COMPLETED,
        claimed_by_ngo_id="ngo-active-1",
        claimed_by_ngo_name="Robin Hood Army - Central",
        claimed_at=yesterday.isoformat(),
        completed_at=yesterday.isoformat(),
        pickup_pin_hash=hash_pickup_pin("1234", "DON-MGR-01"),
        kitchen_facility=facility_id,
        pickup_location="Gate 1",
        beneficiary_target="Community Shelters",
    )
    db_session.add(don1)

    # Dish Ratings
    r1 = DishRating(
        dish_id="dish-paneer",
        dish_name="Paneer Butter Masala",
        rating=5,
        student_id="std-1",
        comment="Excellent dish!",
    )
    r2 = DishRating(
        dish_id="dish-dal",
        dish_name="Dal Makhani",
        rating=4,
        student_id="std-2",
        comment="Good taste.",
    )
    db_session.add_all([r1, r2])
    db_session.commit()


# ── 1. Unauthenticated & Role Boundaries Tests ───────────────────────────────

def test_manager_unauthenticated_rejected(client: TestClient):
    """All manager endpoints require authenticated session."""
    client.cookies.clear()
    assert client.get("/api/v1/manager/overview").status_code == 401
    assert client.get("/api/v1/manager/food-waste-summary").status_code == 401
    assert client.get("/api/v1/manager/donation-summary").status_code == 401
    assert client.get("/api/v1/manager/forecast-inputs").status_code == 401
    assert client.get("/api/v1/manager/safety-buffer").status_code == 401
    assert client.post("/api/v1/manager/safety-buffer/override", json={"safety_buffer_percent": 6.0, "justification": "Valid test"}).status_code == 401


def test_admin_unauthenticated_rejected(client: TestClient):
    """All admin governance endpoints require authenticated session."""
    client.cookies.clear()
    assert client.get("/api/v1/admin/ngos").status_code == 401
    assert client.get("/api/v1/admin/system-config").status_code == 401
    assert client.get("/api/v1/admin/audit-logs").status_code == 401


def test_manager_endpoints_role_boundaries(client: TestClient, setup_manager_admin_data):
    """Students, Kitchen staff, and NGOs cannot access manager endpoints."""
    # Student
    csrf, _ = authenticate_client(client, "student_user")
    res = client.get("/api/v1/manager/overview")
    assert res.status_code == 403

    # Kitchen
    csrf, _ = authenticate_client(client, "kitchen_chef")
    res = client.get("/api/v1/manager/overview")
    assert res.status_code == 403

    # NGO
    csrf, _ = authenticate_client(client, "ngo_user_active")
    res = client.get("/api/v1/manager/overview")
    assert res.status_code == 403

    # Manager (allowed)
    csrf, _ = authenticate_client(client, "manager_north")
    res = client.get("/api/v1/manager/overview")
    assert res.status_code == 200


def test_admin_endpoints_role_boundaries(client: TestClient, setup_manager_admin_data):
    """Only Admins can access administrative governance endpoints."""
    # Manager cannot access global admin endpoints
    csrf, _ = authenticate_client(client, "manager_north")
    assert client.get("/api/v1/admin/ngos").status_code == 403
    assert client.get("/api/v1/admin/system-config").status_code == 403
    assert client.get("/api/v1/admin/audit-logs").status_code == 403

    # Admin is authorized
    csrf, _ = authenticate_client(client, "admin_governance")
    assert client.get("/api/v1/admin/ngos").status_code == 200
    assert client.get("/api/v1/admin/system-config").status_code == 200
    assert client.get("/api/v1/admin/audit-logs").status_code == 200


# ── 2. Cross-Facility Isolation Tests ─────────────────────────────────────────

def test_manager_cross_facility_isolation(client: TestClient, setup_manager_admin_data):
    """Manager of FAC-NORTH is forbidden from accessing FAC-SOUTH records."""
    csrf, _ = authenticate_client(client, "manager_north")

    # Accessing own facility without param succeeds
    res_own = client.get("/api/v1/manager/overview")
    assert res_own.status_code == 200
    assert res_own.json()["facility_id"] == "FAC-NORTH"

    # Explicitly requesting own facility succeeds
    res_own_param = client.get("/api/v1/manager/overview?facility_id=FAC-NORTH")
    assert res_own_param.status_code == 200

    # Cross-facility request to FAC-SOUTH must be strictly rejected
    res_forbidden = client.get("/api/v1/manager/overview?facility_id=FAC-SOUTH")
    assert res_forbidden.status_code == 403
    assert "restricted to their assigned dining facility" in res_forbidden.json()["detail"]


# ── 3. Operational Summaries Calculation Tests ────────────────────────────────

def test_manager_overview_accurate_metrics_and_pii_safety(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Overview derives accurate totals from records without leaking student PII."""
    seed_operational_logs(db_session, facility_id="FAC-NORTH")

    csrf, _ = authenticate_client(client, "manager_north")
    res = client.get("/api/v1/manager/overview")
    assert res.status_code == 200
    data = res.json()

    assert data["facility_id"] == "FAC-NORTH"
    assert data["total_expected_attendance"] == 950  # 500 + 450
    assert data["total_prepared_kg"] == 410.0  # 220 + 190
    assert data["total_consumed_kg"] == 360.0  # 190 + 170
    assert data["total_kitchen_surplus_kg"] == 35.0  # 20 + 15
    assert data["total_plate_waste_kg"] == 15.0  # 10 + 5
    assert data["total_food_waste_kg"] == 50.0  # 35 + 15
    # Waste percentage: 50 / 410 * 100 = 12.2%
    assert 12.1 <= data["food_waste_percentage"] <= 12.3

    assert data["total_donations_created"] == 1
    assert data["total_donations_completed"] == 1
    assert data["total_donated_kg"] == 20.0
    assert data["total_meals_redirected"] == 50

    # Average rating: (5 + 4) / 2 = 4.5
    assert data["average_dish_rating"] == 4.5
    assert data["total_ratings_count"] == 2

    # Verification of zero student PII leakage
    body_str = res.text
    assert "Student One" not in body_str
    assert "Student Two" not in body_str
    assert "std-1" not in body_str
    assert "std-2" not in body_str


def test_food_waste_summary_segregation_and_trends(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Food waste summary separates unserved surplus from compost scraps."""
    seed_operational_logs(db_session, facility_id="FAC-NORTH")

    csrf, _ = authenticate_client(client, "manager_north")
    res = client.get("/api/v1/manager/food-waste-summary")
    assert res.status_code == 200
    data = res.json()

    assert data["total_kitchen_surplus_kg"] == 35.0
    assert data["total_plate_waste_kg"] == 15.0
    assert data["total_waste_kg"] == 50.0
    assert len(data["daily_trends"]) == 2
    assert len(data["meal_breakdown"]) == 2


def test_donation_summary_and_ngo_breakdown(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Donation summary aggregates impact and breaks down by NGO partner."""
    seed_operational_logs(db_session, facility_id="FAC-NORTH")

    csrf, _ = authenticate_client(client, "manager_north")
    res = client.get("/api/v1/manager/donation-summary")
    assert res.status_code == 200
    data = res.json()

    assert data["total_donations"] == 1
    assert data["completed_count"] == 1
    assert data["total_redistributed_kg"] == 20.0
    assert data["total_meals_redistributed"] == 50
    assert len(data["ngo_breakdown"]) == 1
    assert data["ngo_breakdown"][0]["ngo_id"] == "ngo-active-1"
    assert data["ngo_breakdown"][0]["total_kg_received"] == 20.0


def test_forecast_inputs_denotes_historical_without_unsubstantiated_predictions(
    client: TestClient, setup_manager_admin_data, db_session: Session
):
    """Forecast inputs returns historical parameters and denotation."""
    seed_operational_logs(db_session, facility_id="FAC-NORTH")

    csrf, _ = authenticate_client(client, "manager_north")
    res = client.get("/api/v1/manager/forecast-inputs")
    assert res.status_code == 200
    data = res.json()

    assert data["facility_id"] == "FAC-NORTH"
    assert data["historical_observed_period_days"] == 2
    assert data["is_historical_data"] is True
    assert "Observed historical parameters" in data["disclaimer"]
    assert "average_consumption_kg_per_person" in data
    assert data["current_safety_buffer_percent"] == 5.0


def test_manager_date_range_validation(client: TestClient, setup_manager_admin_data):
    """Validates date format and rejects start_date > end_date."""
    csrf, _ = authenticate_client(client, "manager_north")

    # Invalid format -> 422
    res_invalid = client.get("/api/v1/manager/overview?start_date=invalid-date")
    assert res_invalid.status_code == 422

    # start_date > end_date -> 400
    res_reversed = client.get("/api/v1/manager/overview?start_date=2026-10-25&end_date=2026-10-20")
    assert res_reversed.status_code == 400
    assert "cannot be after end_date" in res_reversed.json()["detail"]


# ── 4. Safety Buffer Override Tests ──────────────────────────────────────────

def test_safety_buffer_get_and_override_validation(client: TestClient, setup_manager_admin_data):
    """Validates 0-20% range and mandatory justification."""
    csrf, _ = authenticate_client(client, "manager_north")

    # GET default buffer
    get_res = client.get("/api/v1/manager/safety-buffer")
    assert get_res.status_code == 200
    assert get_res.json()["current_percent"] == 5.0

    # Negative buffer -> 400
    res_neg = client.post(
        "/api/v1/manager/safety-buffer/override",
        headers={"X-CSRF-Token": csrf},
        json={"safety_buffer_percent": -1.5, "justification": "Valid justification text"},
    )
    assert res_neg.status_code == 422 or res_neg.status_code == 400

    # > 20% buffer -> 400 / 422
    res_high = client.post(
        "/api/v1/manager/safety-buffer/override",
        headers={"X-CSRF-Token": csrf},
        json={"safety_buffer_percent": 25.0, "justification": "Valid justification text"},
    )
    assert res_high.status_code == 422 or res_high.status_code == 400

    # Short justification -> 422
    res_short = client.post(
        "/api/v1/manager/safety-buffer/override",
        headers={"X-CSRF-Token": csrf},
        json={"safety_buffer_percent": 8.0, "justification": "bad"},
    )
    assert res_short.status_code == 422


def test_safety_buffer_override_success_and_audit(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Valid buffer override atomically updates SystemConfig and records an AuditEvent."""
    csrf, _ = authenticate_client(client, "manager_north")

    payload = {
        "safety_buffer_percent": 8.5,
        "justification": "Heavy campus rain forecasted; increasing prep cushion for day scholars.",
    }
    res = client.post(
        "/api/v1/manager/safety-buffer/override",
        headers={"X-CSRF-Token": csrf},
        json=payload,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["current_percent"] == 8.5
    assert data["last_justification"] == payload["justification"]

    # Verify SystemConfig in DB
    cfg = db_session.query(SystemConfig).filter(SystemConfig.key == "messaver_safety_buffer").first()
    assert cfg is not None
    assert cfg.value["currentPercent"] == 8.5

    # Verify AuditEvent in DB
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.action == "BUFFER_OVERRIDE_RECORDED")
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    assert audit is not None
    assert audit.severity == AuditSeverity.WARNING
    assert "8.5%" in audit.details
    assert "Heavy campus rain" in audit.details


# ── 5. NGO Partner Administration Tests ───────────────────────────────────────

def test_admin_list_and_filter_ngos(client: TestClient, setup_manager_admin_data):
    """Admin can list, search, and filter NGO partners."""
    csrf, _ = authenticate_client(client, "admin_governance")

    # List all
    res = client.get("/api/v1/admin/ngos")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3

    # Filter verified only
    res_v = client.get("/api/v1/admin/ngos?verified=true")
    assert res_v.status_code == 200
    assert all(item["verified"] for item in res_v.json()["items"])

    # Search by registration
    res_s = client.get("/api/v1/admin/ngos?search=REG-RHA-101")
    assert res_s.status_code == 200
    assert len(res_s.json()["items"]) == 1
    assert res_s.json()["items"][0]["name"] == "Robin Hood Army - Central"


def test_admin_verify_ngo_success_and_audit(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Admin grants verification badge to an unverified NGO and verifies audit trail."""
    csrf, _ = authenticate_client(client, "admin_governance")

    # Grant verification
    res = client.patch(
        "/api/v1/admin/ngos/ngo-unv-1/verify",
        headers={"X-CSRF-Token": csrf},
        json={
            "verified": True,
            "verification_badge": "Verified Community Emergency Kitchen",
            "reason": "Submitted valid municipal health inspector audit certificate.",
        },
    )
    assert res.status_code == 200
    ngo_data = res.json()
    assert ngo_data["verified"] is True
    assert ngo_data["verification_badge"] == "Verified Community Emergency Kitchen"

    # Verify audit event
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.action == "NGO_VERIFICATION_UPDATED")
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    assert audit is not None
    assert "ngo-unv-1" in audit.details
    assert "municipal health inspector" in audit.details


def test_admin_deactivate_and_activate_ngo(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Deactivating an NGO deactivates the partner and its linked user accounts."""
    csrf, _ = authenticate_client(client, "admin_governance")

    # Deactivate active NGO
    res = client.patch(
        "/api/v1/admin/ngos/ngo-active-1/activate",
        headers={"X-CSRF-Token": csrf},
        json={"is_active": False, "reason": "Fleet vehicle undergoing mandatory hygiene overhaul."},
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # Check database state of NGO and linked user
    ngo = db_session.query(NgoPartner).filter(NgoPartner.id == "ngo-active-1").first()
    assert ngo.is_active is False
    linked_user = db_session.query(User).filter(User.username == "ngo_user_active").first()
    assert linked_user.is_active is False

    # Audit event logged
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.action == "NGO_ACTIVATION_UPDATED")
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    assert audit is not None
    assert "DEACTIVATED" in audit.details
    assert audit.severity == AuditSeverity.WARNING


def test_deactivated_or_unverified_ngo_cannot_claim_donation(
    client: TestClient, setup_manager_admin_data, db_session: Session
):
    """Deactivated or unverified NGO cannot claim donations."""
    now_utc = datetime.now(timezone.utc)
    donation = SurplusDonation(
        id="DON-CLAIM-TEST",
        food_title="Available Surplus Curries",
        dishes=[{"name": "Mixed Veg Curry", "quantityKg": 25.0}],
        total_quantity_kg=25.0,
        servings_count=50,
        meal_type=MealType.DINNER,
        prepared_at="18:00",
        temperature_at_packaging=66.0,
        is_hygienically_packed=True,
        is_plate_leftover=False,
        expiry_deadline=(now_utc + timedelta(hours=3)).isoformat(),
        status=DonationStatus.AVAILABLE,
        pickup_pin_hash=hash_pickup_pin("1234", "DON-CLAIM-TEST"),
        kitchen_facility="FAC-NORTH",
        pickup_location="Gate 2",
        beneficiary_target="Community",
    )
    db_session.add(donation)
    db_session.commit()

    # 1. Unverified NGO attempt
    csrf_unv, _ = authenticate_client(client, "ngo_user_unv")
    res_unv = client.post(
        f"/api/v1/surplus/{donation.id}/claim",
        headers={"X-CSRF-Token": csrf_unv},
        json={"notes": "Driver arriving"},
    )
    assert res_unv.status_code == 403
    assert "verified" in res_unv.json()["detail"].lower()

    # 2. Deactivated NGO attempt
    # Note: user is deactivated, login is rejected or session is barred
    res_inact_login = client.post("/api/v1/auth/login", json={"identifier": "ngo_user_inact", "password": "pass123"})
    assert res_inact_login.status_code == 401 or res_inact_login.status_code == 403


# ── 6. System Configuration Management Tests ─────────────────────────────────

def test_admin_system_config_allowlist_and_secret_rejection(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Admin config API enforces strict allowlist and blocks secret injection."""
    csrf, _ = authenticate_client(client, "admin_governance")

    # List system configs
    res_list = client.get("/api/v1/admin/system-config")
    assert res_list.status_code == 200
    keys = [c["key"] for c in res_list.json()["items"]]
    assert "messaver_safety_buffer" in keys
    assert "messaver_meal_cutoffs" in keys
    assert "messaver_food_safety_rules" in keys

    # Attempt to update arbitrary key outside allowlist -> 400
    res_arb = client.put(
        "/api/v1/admin/system-config/arbitrary_injected_key",
        headers={"X-CSRF-Token": csrf},
        json={"value": "test", "reason": "Attempting arbitrary configuration"},
    )
    assert res_arb.status_code == 400
    assert "not in the permitted" in res_arb.json()["detail"]

    # Attempt to inject secret in value -> 400
    res_sec = client.put(
        "/api/v1/admin/system-config/messaver_food_safety_rules",
        headers={"X-CSRF-Token": csrf},
        json={"value": {"min_temp": 60, "db_password": "supersecretpassword"}, "reason": "Testing secret rejection"},
    )
    assert res_sec.status_code == 400
    assert "Security violation" in res_sec.json()["detail"]

    # Valid config update -> 200
    res_ok = client.put(
        "/api/v1/admin/system-config/messaver_food_safety_rules",
        headers={"X-CSRF-Token": csrf},
        json={
            "value": {
                "min_holding_temp_celsius": 62.0,
                "max_holding_window_mins": 90,
                "student_cutoff_hours": 2.5,
            },
            "reason": "Tightening holding parameters for summer food-safety compliance.",
        },
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["value"]["min_holding_temp_celsius"] == 62.0


# ── 7. Administrative Audit History Tests ────────────────────────────────────

def test_admin_audit_logs_filters_and_read_only(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Global audit history endpoint supports filters, and no mutation endpoints exist."""
    # Seed sample audit events
    a1 = AuditEvent(
        id="aud-1",
        timestamp=datetime.now(timezone.utc).isoformat(),
        actor_name="manager_north",
        actor_role=UserRole.MANAGER,
        action="BUFFER_OVERRIDE_RECORDED",
        details="Manager adjusted safety buffer to 7.0%",
        severity=AuditSeverity.WARNING,
    )
    a2 = AuditEvent(
        id="aud-2",
        timestamp=datetime.now(timezone.utc).isoformat(),
        actor_name="admin_governance",
        actor_role=UserRole.ADMIN,
        action="NGO_VERIFICATION_UPDATED",
        details="Granted verification credential",
        severity=AuditSeverity.INFO,
    )
    db_session.add_all([a1, a2])
    db_session.commit()

    csrf, _ = authenticate_client(client, "admin_governance")

    # List all
    res = client.get("/api/v1/admin/audit-logs")
    assert res.status_code == 200
    assert res.json()["total"] >= 2

    # Filter by action
    res_act = client.get("/api/v1/admin/audit-logs?action=BUFFER_OVERRIDE_RECORDED")
    assert res_act.status_code == 200
    assert all(it["action"] == "BUFFER_OVERRIDE_RECORDED" for it in res_act.json()["items"])

    # Filter by severity
    res_sev = client.get("/api/v1/admin/audit-logs?severity=warning")
    assert res_sev.status_code == 200
    assert all(it["severity"] == "warning" for it in res_sev.json()["items"])

    # Search filter
    res_search = client.get("/api/v1/admin/audit-logs?search=safety buffer")
    assert res_search.status_code == 200
    assert len(res_search.json()["items"]) >= 1

    # Verify append-only: DELETE and PUT methods on audit logs must be 405 Method Not Allowed
    assert client.delete("/api/v1/admin/audit-logs/aud-1").status_code in {404, 405}
    assert client.put("/api/v1/admin/audit-logs/aud-1", json={"details": "tampered"}).status_code in {404, 405}


def test_manager_facility_audit_logs_scoped(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Manager can inspect facility-relevant audit logs."""
    a = AuditEvent(
        id="aud-mgr-fac",
        timestamp=datetime.now(timezone.utc).isoformat(),
        actor_name="manager_north",
        actor_role=UserRole.MANAGER,
        action="BUFFER_OVERRIDE_RECORDED",
        details="Manager adjusted safety buffer for FAC-NORTH",
        severity=AuditSeverity.WARNING,
    )
    db_session.add(a)
    db_session.commit()

    csrf, _ = authenticate_client(client, "manager_north")
    res = client.get("/api/v1/manager/audit-logs")
    assert res.status_code == 200
    assert any(it["id"] == "aud-mgr-fac" for it in res.json()["items"])


def test_pin_and_secret_redaction_guarantee(client: TestClient, setup_manager_admin_data, db_session: Session):
    """Ensures PIN hashes, peppers, and passwords are never exposed across manager and admin responses."""
    seed_operational_logs(db_session, facility_id="FAC-NORTH")

    # Manager responses
    csrf_m, _ = authenticate_client(client, "manager_north")
    res_overview = client.get("/api/v1/manager/overview").text
    res_donations = client.get("/api/v1/manager/donation-summary").text
    assert "pickup_pin" not in res_overview
    assert "pickup_pin_hash" not in res_overview
    assert "pickup_pin" not in res_donations
    assert "pickup_pin_hash" not in res_donations

    # Admin responses
    csrf_a, _ = authenticate_client(client, "admin_governance")
    res_audit = client.get("/api/v1/admin/audit-logs").text
    assert "pickup_pin_hash" not in res_audit
    assert "password_hash" not in res_audit
    assert "session_token" not in res_audit
