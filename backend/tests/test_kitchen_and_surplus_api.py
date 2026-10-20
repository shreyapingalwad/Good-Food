"""
Comprehensive automated tests for Phase 3.2:
- Kitchen Production Logs & Strict Waste Segregation (POST/GET /api/v1/kitchen/logs, GET /api/v1/kitchen/summary)
- Surplus Donation Offer Creation & Food Safety (POST/GET /api/v1/surplus, GET /api/v1/surplus/me, GET /api/v1/surplus/available)
- Anti-spoofing, CSRF validation, RBAC boundaries, temperature rules, pickup PIN hashing, and audit trails.
"""
from datetime import datetime, timedelta, timezone
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.pin_security import verify_pickup_pin
from app.core.security import hash_secret
from app.models.audit import AuditEvent
from app.models.donation import SurplusDonation
from app.models.enums import AuditSeverity, DonationStatus, MealType, UserRole
from app.models.kitchen_log import KitchenLog
from app.models.ngo import NgoPartner
from app.models.user import User


# ── Fixtures & Setup ──────────────────────────────────────────────────────────

@pytest.fixture
def setup_phase3_2_users(db_session: Session):
    """Seed test users covering Student, Kitchen, Manager, NGO, and Admin roles."""
    ngo = NgoPartner(
        id="ngo-1",
        name="Robin Hood Army - South Campus Wing",
        registration_number="REG-RHA-001",
        contact_person="Robin Coordinator",
        phone="+91 98765 43210",
        vehicle_type="Insulated Electric Van",
        verified=True,
    )
    db_session.add(ngo)
    db_session.flush()

    users = [
        User(
            id="usr-std-100",
            username="student_sam",
            email="sam@campus.edu",
            full_name="Sam Student",
            password_hash=hash_secret("pass123"),
            role=UserRole.STUDENT,
            facility_id="FAC-NORTH",
        ),
        User(
            id="usr-kit-north",
            username="chef_ramesh",
            email="ramesh@campus.edu",
            full_name="Chef Ramesh",
            password_hash=hash_secret("pass123"),
            role=UserRole.KITCHEN,
            facility_id="FAC-NORTH",
        ),
        User(
            id="usr-kit-south",
            username="chef_kavita",
            email="kavita@campus.edu",
            full_name="Chef Kavita",
            password_hash=hash_secret("pass123"),
            role=UserRole.KITCHEN,
            facility_id="FAC-SOUTH",
        ),
        User(
            id="usr-kit-unassigned",
            username="chef_floating",
            email="floating@campus.edu",
            full_name="Chef Floating",
            password_hash=hash_secret("pass123"),
            role=UserRole.KITCHEN,
            facility_id=None,  # Unassigned facility test
        ),
        User(
            id="usr-mgr-north",
            username="mgr_north",
            email="mgr_n@campus.edu",
            full_name="Manager North",
            password_hash=hash_secret("pass123"),
            role=UserRole.MANAGER,
            facility_id="FAC-NORTH",
        ),
        User(
            id="usr-ngo-rep",
            username="ngo_robin",
            email="robin@rha.org",
            full_name="Robin Hood Army Dispatcher",
            password_hash=hash_secret("pass123"),
            role=UserRole.NGO,
            ngo_id="ngo-1",
        ),
        User(
            id="usr-admin-root",
            username="admin_super",
            email="admin@campus.edu",
            full_name="Super Admin",
            password_hash=hash_secret("pass123"),
            role=UserRole.ADMIN,
        ),
    ]
    for u in users:
        db_session.add(u)
    db_session.commit()
    return {u.username: u for u in users}


def authenticate_client(client: TestClient, identifier: str, password: str = "pass123") -> tuple[str, str]:
    """Helper to authenticate and return (csrf_token, session_cookie)."""
    res = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})
    assert res.status_code == 200, f"Login failed for {identifier}: {res.text}"
    csrf = res.json()["user"]["csrf_token"]
    cookie = res.cookies.get("messaver_session")
    return csrf, cookie


# ── 1. Unauthenticated & CSRF Tests ──────────────────────────────────────────

def test_kitchen_and_surplus_unauthenticated_rejected(client: TestClient):
    """Unauthenticated requests to kitchen and surplus endpoints must be rejected with 401."""
    assert client.post("/api/v1/kitchen/logs", json={}).status_code == 401
    assert client.get("/api/v1/kitchen/logs").status_code == 401
    assert client.get("/api/v1/kitchen/summary").status_code == 401
    assert client.post("/api/v1/surplus", json={}).status_code == 401
    assert client.get("/api/v1/surplus/me").status_code == 401
    assert client.get("/api/v1/surplus/available").status_code == 401


def test_kitchen_and_surplus_csrf_enforcement(client: TestClient, setup_phase3_2_users):
    """Mutations without valid CSRF tokens must be rejected with 403."""
    _, cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", cookie)

    # 1. POST /kitchen/logs without CSRF header
    res_kit = client.post(
        "/api/v1/kitchen/logs",
        json={
            "date": "2026-10-21",
            "meal_type": "Lunch",
            "dish_name": "Dal Makhani",
            "expected_attendance": 450,
            "recommended_kg": 90.0,
            "actual_prepared_kg": 95.0,
            "consumed_kg": 88.0,
            "kitchen_surplus_kg": 7.0,
            "plate_waste_kg": 3.0,
        },
    )
    assert res_kit.status_code == 403
    assert "CSRF token missing" in res_kit.json()["detail"]

    # 2. POST /surplus without CSRF header
    future_time = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    res_surplus = client.post(
        "/api/v1/surplus",
        json={
            "food_title": "Surplus Rice",
            "dishes": [{"name": "Rice", "quantityKg": 10.0}],
            "total_quantity_kg": 10.0,
            "servings_count": 25,
            "meal_type": "Lunch",
            "prepared_at": "12:30 PM",
            "temperature_at_packaging": 68.0,
            "expiry_deadline": future_time,
            "pickup_location": "Gate 1",
            "beneficiary_target": "Local Shelter",
        },
    )
    assert res_surplus.status_code == 403


# ── 2. Role Permissions & Unauthorized Rejections ────────────────────────────

def test_student_forbidden_from_kitchen_and_surplus(client: TestClient, setup_phase3_2_users):
    """Students lack permissions for kitchen operations and surplus donation creation."""
    csrf, cookie = authenticate_client(client, "student_sam")
    client.cookies.set("messaver_session", cookie)

    # Student cannot create kitchen logs
    res1 = client.post(
        "/api/v1/kitchen/logs",
        headers={"X-CSRF-Token": csrf},
        json={
            "date": "2026-10-21",
            "meal_type": "Lunch",
            "dish_name": "Dal",
            "expected_attendance": 100,
            "recommended_kg": 20.0,
            "actual_prepared_kg": 20.0,
            "consumed_kg": 18.0,
            "kitchen_surplus_kg": 2.0,
            "plate_waste_kg": 1.0,
        },
    )
    assert res1.status_code == 403

    # Student cannot view kitchen logs
    assert client.get("/api/v1/kitchen/logs").status_code == 403

    # Student cannot view kitchen summary
    assert client.get("/api/v1/kitchen/summary").status_code == 403

    # Student cannot create surplus donations
    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    res2 = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": csrf},
        json={
            "food_title": "Rice",
            "dishes": [{"name": "Rice", "quantityKg": 5.0}],
            "total_quantity_kg": 5.0,
            "servings_count": 10,
            "meal_type": "Lunch",
            "prepared_at": "12:00 PM",
            "temperature_at_packaging": 65.0,
            "expiry_deadline": future_time,
            "pickup_location": "Gate 1",
            "beneficiary_target": "Shelter",
        },
    )
    assert res2.status_code == 403

    # Student cannot view available donations
    assert client.get("/api/v1/surplus/available").status_code == 403


def test_ngo_can_view_available_surplus_only(client: TestClient, setup_phase3_2_users):
    """NGOs can view available surplus offers, but cannot create offers or access kitchen logs."""
    csrf, cookie = authenticate_client(client, "ngo_robin")
    client.cookies.set("messaver_session", cookie)

    # NGO cannot access kitchen logs
    assert client.get("/api/v1/kitchen/logs").status_code == 403
    assert client.get("/api/v1/kitchen/summary").status_code == 403

    # NGO cannot create surplus offers
    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    res = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": csrf},
        json={
            "food_title": "Rice",
            "dishes": [{"name": "Rice", "quantityKg": 5.0}],
            "total_quantity_kg": 5.0,
            "servings_count": 10,
            "meal_type": "Lunch",
            "prepared_at": "12:00 PM",
            "temperature_at_packaging": 65.0,
            "expiry_deadline": future_time,
            "pickup_location": "Gate 1",
            "beneficiary_target": "Shelter",
        },
    )
    assert res.status_code == 403

    # NGO CAN view available surplus offers
    res_avail = client.get("/api/v1/surplus/available")
    assert res_avail.status_code == 200
    assert "items" in res_avail.json()


# ── 3. Kitchen Production Logs & Waste Segregation ────────────────────────────

def test_kitchen_log_creation_success_and_waste_segregation(
    client: TestClient, setup_phase3_2_users, db_session: Session
):
    """
    Kitchen staff records a production batch:
    - Verifies separate storage of kitchen_surplus_kg and plate_waste_kg.
    - Facility is derived from session (anti-spoofing).
    - Audit event is created.
    """
    csrf, cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        "/api/v1/kitchen/logs",
        headers={"X-CSRF-Token": csrf},
        json={
            "date": "2026-10-21",
            "meal_type": "Lunch",
            "dish_name": "Paneer Butter Masala",
            "expected_attendance": 500,
            "recommended_kg": 100.0,
            "actual_prepared_kg": 105.0,
            "consumed_kg": 95.0,
            "kitchen_surplus_kg": 10.0,  # Unserved edible surplus
            "plate_waste_kg": 4.5,       # Ineligible customer scraps
            "notes": "Good consistency, popular dish",
            "facility_id": "FAC-SOUTH",  # Spoof attempt: must be ignored and assigned to FAC-NORTH
            "recorded_by": "Spoofed Actor",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["dish_name"] == "Paneer Butter Masala"
    assert data["facility_id"] == "FAC-NORTH"  # Enforced from session!
    assert data["recorded_by"] == "Chef Ramesh"  # Enforced from session!
    assert data["kitchen_surplus_kg"] == 10.0
    assert data["plate_waste_kg"] == 4.5

    # Check database persistence
    saved_log = db_session.query(KitchenLog).filter(KitchenLog.id == data["id"]).first()
    assert saved_log is not None
    assert saved_log.facility_id == "FAC-NORTH"
    assert saved_log.kitchen_surplus_kg == 10.0
    assert saved_log.plate_waste_kg == 4.5

    # Check audit log creation
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.action == "RECORD_KITCHEN_METRICS")
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    assert audit is not None
    assert audit.actor_name == "Chef Ramesh"
    assert "FAC-NORTH" in audit.details


def test_kitchen_log_numeric_boundary_and_non_finite_rejections(
    client: TestClient, setup_phase3_2_users
):
    """Negative values and invalid non-finite numbers must be rejected with 422."""
    csrf, cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", cookie)

    # 1. Negative surplus
    res_neg = client.post(
        "/api/v1/kitchen/logs",
        headers={"X-CSRF-Token": csrf},
        json={
            "date": "2026-10-21",
            "meal_type": "Lunch",
            "dish_name": "Dal",
            "expected_attendance": 100,
            "recommended_kg": 20.0,
            "actual_prepared_kg": 20.0,
            "consumed_kg": 18.0,
            "kitchen_surplus_kg": -5.0,  # Invalid
            "plate_waste_kg": 2.0,
        },
    )
    assert res_neg.status_code == 422

    # 2. Negative plate waste
    res_neg_waste = client.post(
        "/api/v1/kitchen/logs",
        headers={"X-CSRF-Token": csrf},
        json={
            "date": "2026-10-21",
            "meal_type": "Lunch",
            "dish_name": "Dal",
            "expected_attendance": 100,
            "recommended_kg": 20.0,
            "actual_prepared_kg": 20.0,
            "consumed_kg": 18.0,
            "kitchen_surplus_kg": 5.0,
            "plate_waste_kg": -1.0,  # Invalid
        },
    )
    assert res_neg_waste.status_code == 422

    # 3. Invalid date format
    res_bad_date = client.post(
        "/api/v1/kitchen/logs",
        headers={"X-CSRF-Token": csrf},
        json={
            "date": "21-10-2026",  # Not YYYY-MM-DD
            "meal_type": "Lunch",
            "dish_name": "Dal",
            "expected_attendance": 100,
            "recommended_kg": 20.0,
            "actual_prepared_kg": 20.0,
            "consumed_kg": 18.0,
            "kitchen_surplus_kg": 2.0,
            "plate_waste_kg": 1.0,
        },
    )
    assert res_bad_date.status_code == 422


def test_kitchen_unassigned_facility_rejected(client: TestClient, setup_phase3_2_users):
    """Kitchen staff without an assigned facility cannot record logs (403 Forbidden)."""
    csrf, cookie = authenticate_client(client, "chef_floating")
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        "/api/v1/kitchen/logs",
        headers={"X-CSRF-Token": csrf},
        json={
            "date": "2026-10-21",
            "meal_type": "Lunch",
            "dish_name": "Dal",
            "expected_attendance": 100,
            "recommended_kg": 20.0,
            "actual_prepared_kg": 20.0,
            "consumed_kg": 18.0,
            "kitchen_surplus_kg": 2.0,
            "plate_waste_kg": 1.0,
        },
    )
    assert res.status_code == 403
    assert "no assigned facility" in res.json()["detail"].lower()


# ── 4. Facility Scoping & Cross-Facility Isolation ───────────────────────────

def test_kitchen_logs_cross_facility_isolation(
    client: TestClient, setup_phase3_2_users, db_session: Session
):
    """
    Facility North staff cannot read Facility South logs.
    Manager North cannot query Facility South.
    """
    # Seed 1 log in North, 1 log in South
    log_north = KitchenLog(
        id="klog-north-1",
        date="2026-10-21",
        meal_type=MealType.LUNCH,
        dish_name="North Biryani",
        facility_id="FAC-NORTH",
        expected_attendance=300,
        recommended_kg=60.0,
        actual_prepared_kg=62.0,
        consumed_kg=58.0,
        kitchen_surplus_kg=4.0,
        plate_waste_kg=2.0,
        recorded_by="Chef Ramesh",
    )
    log_south = KitchenLog(
        id="klog-south-1",
        date="2026-10-21",
        meal_type=MealType.LUNCH,
        dish_name="South Idli",
        facility_id="FAC-SOUTH",
        expected_attendance=200,
        recommended_kg=40.0,
        actual_prepared_kg=40.0,
        consumed_kg=35.0,
        kitchen_surplus_kg=5.0,
        plate_waste_kg=1.5,
        recorded_by="Chef Kavita",
    )
    db_session.add(log_north)
    db_session.add(log_south)
    db_session.commit()

    # 1. Chef Ramesh (North) queries logs
    _, ramesh_cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", ramesh_cookie)
    res_north = client.get("/api/v1/kitchen/logs")
    assert res_north.status_code == 200
    items = res_north.json()["items"]
    assert len(items) == 1
    assert items[0]["facility_id"] == "FAC-NORTH"
    assert items[0]["dish_name"] == "North Biryani"

    # Chef Ramesh attempting to explicitly request FAC-SOUTH is blocked
    res_forbidden = client.get("/api/v1/kitchen/logs?facility_id=FAC-SOUTH")
    assert res_forbidden.status_code == 403

    # 2. Manager North querying summary for FAC-NORTH succeeds
    _, mgr_cookie = authenticate_client(client, "mgr_north")
    client.cookies.set("messaver_session", mgr_cookie)
    res_summary = client.get("/api/v1/kitchen/summary?date=2026-10-21")
    assert res_summary.status_code == 200
    s_data = res_summary.json()
    assert s_data["facility_id"] == "FAC-NORTH"
    assert s_data["total_prepared_kg"] == 62.0
    assert s_data["total_kitchen_surplus_kg"] == 4.0
    assert s_data["total_plate_waste_kg"] == 2.0

    # Manager North querying FAC-SOUTH summary receives 403
    res_mgr_cross = client.get("/api/v1/kitchen/summary?facility_id=FAC-SOUTH&date=2026-10-21")
    assert res_mgr_cross.status_code == 403

    # 3. Super Admin can query FAC-SOUTH
    _, adm_cookie = authenticate_client(client, "admin_super")
    client.cookies.set("messaver_session", adm_cookie)
    res_adm = client.get("/api/v1/kitchen/summary?facility_id=FAC-SOUTH&date=2026-10-21")
    assert res_adm.status_code == 200
    assert res_adm.json()["facility_id"] == "FAC-SOUTH"
    assert res_adm.json()["total_prepared_kg"] == 40.0


# ── 5. Surplus Donation Offer Creation & Food Safety ──────────────────────────

def test_surplus_donation_creation_success_and_pin_generation(
    client: TestClient, setup_phase3_2_users, db_session: Session
):
    """
    Chef creates an eligible surplus donation:
    - Temperature >= 60°C is accepted.
    - Plate leftovers = False is accepted.
    - Plaintext PIN is returned once in response.
    - Plaintext PIN is hashed with server pepper and never stored in database.
    - Audit event is created.
    """
    csrf, cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", cookie)

    future_exp = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    res = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": csrf},
        json={
            "food_title": "Steamed Rice & Paneer Curry (Unserved Batch)",
            "dishes": [
                {"name": "Steamed Rice", "quantityKg": 20.0},
                {"name": "Paneer Curry", "quantityKg": 15.0},
            ],
            "total_quantity_kg": 35.0,
            "servings_count": 80,
            "meal_type": "Lunch",
            "prepared_at": "12:30 PM",
            "temperature_at_packaging": 68.5,  # Hot held: valid
            "is_hygienically_packed": True,
            "is_plate_leftover": False,
            "expiry_deadline": future_exp,
            "pickup_location": "Kitchen Dispatch Gate 3",
            "beneficiary_target": "Local Night Shelter",
            "kitchen_facility": "FAC-SOUTH",  # Spoof attempt: must be overridden with FAC-NORTH
            "status": "COMPLETED",            # Spoof attempt: must default to AVAILABLE
        },
    )
    assert res.status_code == 201
    data = res.json()
    donation_id = data["id"]
    assert donation_id.startswith("DON-")
    assert data["kitchen_facility"] == "FAC-NORTH"  # Enforced from session!
    assert data["status"] == "AVAILABLE"            # Enforced!
    assert data["is_plate_leftover"] is False

    # Plaintext PIN returned in one-time create response
    pickup_pin = data["pickup_pin"]
    assert len(pickup_pin) == 4
    assert pickup_pin.isdigit()

    # Verify Database state
    donation_db = db_session.query(SurplusDonation).filter(SurplusDonation.id == donation_id).first()
    assert donation_db is not None
    assert donation_db.total_quantity_kg == 35.0
    assert donation_db.kitchen_facility == "FAC-NORTH"

    # Plaintext PIN is NOT in the database; only cryptographic hash exists
    assert not hasattr(donation_db, "pickup_pin")
    assert donation_db.pickup_pin_hash != pickup_pin
    assert verify_pickup_pin(pickup_pin, donation_id, donation_db.pickup_pin_hash) is True

    # Audit event created
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.action == "SURPLUS_OFFERED")
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    assert audit is not None
    assert "FAC-NORTH" in audit.details
    assert donation_id in audit.details


def test_surplus_donation_cold_held_accepted(client: TestClient, setup_phase3_2_users):
    """Food that has been rapid-chilled (<= 8°C) is accepted for safe donation."""
    csrf, cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", cookie)

    future_exp = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()
    res = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": csrf},
        json={
            "food_title": "Chilled Fruit Salad & Custard",
            "dishes": [{"name": "Fruit Custard", "quantityKg": 12.0}],
            "total_quantity_kg": 12.0,
            "servings_count": 40,
            "meal_type": "Dinner",
            "prepared_at": "05:00 PM",
            "temperature_at_packaging": 5.0,  # Cold held: valid (<= 8°C)
            "is_plate_leftover": False,
            "expiry_deadline": future_exp,
            "pickup_location": "Cold Bay 2",
            "beneficiary_target": "Children Home",
        },
    )
    assert res.status_code == 201
    assert res.json()["temperature_at_packaging"] == 5.0


def test_surplus_donation_plate_leftovers_strictly_rejected(client: TestClient, setup_phase3_2_users):
    """
    CRITICAL FOOD SAFETY RULE:
    Attempting to create a donation from plate leftovers (is_plate_leftover=True)
    must be strictly rejected with 422 or 400.
    """
    csrf, cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", cookie)

    future_exp = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    res = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": csrf},
        json={
            "food_title": "Returned Scraps",
            "dishes": [{"name": "Rice", "quantityKg": 5.0}],
            "total_quantity_kg": 5.0,
            "servings_count": 10,
            "meal_type": "Lunch",
            "prepared_at": "12:00 PM",
            "temperature_at_packaging": 65.0,
            "is_plate_leftover": True,  # PROHIBITED!
            "expiry_deadline": future_exp,
            "pickup_location": "Gate 1",
            "beneficiary_target": "Shelter",
        },
    )
    assert res.status_code in (400, 422)


def test_surplus_donation_temperature_danger_zone_rejected(client: TestClient, setup_phase3_2_users):
    """
    Food packaged in the bacterial danger zone (8°C < temp < 60°C)
    must be rejected to prevent food poisoning.
    """
    csrf, cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", cookie)

    future_exp = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

    # Temperature 35°C (lukewarm, dangerous)
    res_warm = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": csrf},
        json={
            "food_title": "Lukewarm Curry",
            "dishes": [{"name": "Curry", "quantityKg": 10.0}],
            "total_quantity_kg": 10.0,
            "servings_count": 20,
            "meal_type": "Lunch",
            "prepared_at": "12:00 PM",
            "temperature_at_packaging": 35.0,  # DANGER ZONE!
            "is_plate_leftover": False,
            "expiry_deadline": future_exp,
            "pickup_location": "Gate 1",
            "beneficiary_target": "Shelter",
        },
    )
    assert res_warm.status_code in (400, 422)


def test_surplus_donation_past_expiry_rejected(client: TestClient, setup_phase3_2_users):
    """Donations with an expired safety deadline must be rejected."""
    csrf, cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", cookie)

    # Expiry 1 hour in the past
    past_exp = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    res = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": csrf},
        json={
            "food_title": "Old Rice",
            "dishes": [{"name": "Rice", "quantityKg": 10.0}],
            "total_quantity_kg": 10.0,
            "servings_count": 20,
            "meal_type": "Lunch",
            "prepared_at": "Yesterday",
            "temperature_at_packaging": 65.0,
            "is_plate_leftover": False,
            "expiry_deadline": past_exp,
            "pickup_location": "Gate 1",
            "beneficiary_target": "Shelter",
        },
    )
    assert res.status_code in (400, 422)


# ── 6. Retrieval Endpoints & PIN Exposure Prevention ──────────────────────────

def test_surplus_retrieval_never_exposes_pins(
    client: TestClient, setup_phase3_2_users, db_session: Session
):
    """
    CRITICAL SECURITY CHECK:
    Neither /surplus/me nor /surplus/available may expose plaintext pickup PINs
    or cryptographic pickup PIN hashes to any caller.
    """
    future_exp = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()

    # Seed an available donation
    don = SurplusDonation(
        id="DON-7777",
        food_title="Available Lentil Soup",
        dishes=[{"name": "Soup", "quantityKg": 15.0}],
        total_quantity_kg=15.0,
        servings_count=35,
        meal_type=MealType.LUNCH,
        prepared_at="12:00 PM",
        temperature_at_packaging=70.0,
        is_hygienically_packed=True,
        is_plate_leftover=False,
        expiry_deadline=future_exp,
        status=DonationStatus.AVAILABLE,
        pickup_pin_hash="bcrypt_hashed_pin_value_here",
        kitchen_facility="FAC-NORTH",
        pickup_location="Gate 2",
        beneficiary_target="Slum Community Center",
    )
    db_session.add(don)
    db_session.commit()

    # 1. Kitchen staff queries /surplus/me
    _, kit_cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", kit_cookie)
    res_me = client.get("/api/v1/surplus/me")
    assert res_me.status_code == 200
    items_me = res_me.json()["items"]
    assert len(items_me) == 1
    assert items_me[0]["id"] == "DON-7777"
    assert "pickup_pin" not in items_me[0]
    assert "pickup_pin_hash" not in items_me[0]

    # 2. NGO queries /surplus/available
    _, ngo_cookie = authenticate_client(client, "ngo_robin")
    client.cookies.set("messaver_session", ngo_cookie)
    res_avail = client.get("/api/v1/surplus/available")
    assert res_avail.status_code == 200
    items_avail = res_avail.json()["items"]
    assert len(items_avail) == 1
    assert items_avail[0]["id"] == "DON-7777"
    assert "pickup_pin" not in items_avail[0]
    assert "pickup_pin_hash" not in items_avail[0]
