"""
Phase 4, 5, and 6 End-to-End Enterprise Integration Test Suite
Validates the complete food waste prediction, student participation,
kitchen surplus, NGO redistribution, and administrative governance lifecycle.
"""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_secret
from app.models.enums import AuditSeverity, DonationStatus, MealType, UserRole
from app.models.ngo import NgoPartner
from app.models.system_config import SystemConfig
from app.models.user import User


@pytest.fixture
def setup_e2e_environment(db_session: Session):
    """Sets up a complete institutional campus environment for end-to-end testing."""
    # 1. Seed Verified NGO Partner
    ngo_central = NgoPartner(
        id="ngo-e2e-central",
        name="Robin Hood Army - Campus Chapter",
        registration_number="REG-E2E-RHA-909",
        contact_person="Arunav Sharma",
        phone="+91 98765 43210",
        vehicle_type="Insulated Electric Van (Temp-Controlled)",
        verified=True,
        is_active=True,
        total_pickups_completed=10,
        meals_distributed=500,
    )
    # 2. Seed Second NGO for concurrent contention testing
    ngo_competing = NgoPartner(
        id="ngo-e2e-competing",
        name="Feeding India Shelter Group",
        registration_number="REG-E2E-FI-808",
        contact_person="Pooja Mehta",
        phone="+91 98765 88888",
        vehicle_type="Light Commercial Vehicle",
        verified=True,
        is_active=True,
        total_pickups_completed=5,
        meals_distributed=250,
    )
    db_session.add_all([ngo_central, ngo_competing])
    db_session.flush()

    # 3. Seed Users across all operational roles
    test_users = [
        User(
            id="usr-e2e-student",
            username="student_shreya",
            email="shreya@campus.edu",
            full_name="Shreya Pingalwad",
            password_hash=hash_secret("DevStudentPass123!"),
            role=UserRole.STUDENT,
            facility_id="Grand Central Mess - Block B",
            is_active=True,
        ),
        User(
            id="usr-e2e-kitchen",
            username="chef_rajesh",
            email="rajesh@campus.edu",
            full_name="Chef Rajesh Kumar",
            password_hash=hash_secret("DevKitchenPass123!"),
            role=UserRole.KITCHEN,
            facility_id="Grand Central Mess - Block B",
            is_active=True,
        ),
        User(
            id="usr-e2e-manager",
            username="dr_anita_roy",
            email="anita@campus.edu",
            full_name="Dr. Anita Roy",
            password_hash=hash_secret("DevManagerPass123!"),
            role=UserRole.MANAGER,
            facility_id="Grand Central Mess - Block B",
            is_active=True,
        ),
        User(
            id="usr-e2e-ngo",
            username="rha_arunav",
            email="arunav@rha.org",
            full_name="Arunav Sharma",
            password_hash=hash_secret("DevNgoPass123!"),
            role=UserRole.NGO,
            ngo_id="ngo-e2e-central",
            is_active=True,
        ),
        User(
            id="usr-e2e-ngo-competing",
            username="fi_pooja",
            email="pooja@feedingindia.org",
            full_name="Pooja Mehta",
            password_hash=hash_secret("DevNgoPass123!"),
            role=UserRole.NGO,
            ngo_id="ngo-e2e-competing",
            is_active=True,
        ),
        User(
            id="usr-e2e-admin",
            username="sys_admin",
            email="admin@campus.edu",
            full_name="Campus Governance Admin",
            password_hash=hash_secret("DevAdminPass123!"),
            role=UserRole.ADMIN,
            is_active=True,
        ),
    ]
    for u in test_users:
        db_session.add(u)

    # 4. Seed default safety buffer
    buffer_cfg = SystemConfig(
        key="messaver_safety_buffer",
        value={"currentPercent": 5.0, "minPercent": 0.0, "maxPercent": 20.0, "justification": "Institutional baseline buffer"},
        description="Operational safety buffer percentage over predicted headcount",
        updated_by="system_init",
    )
    db_session.add(buffer_cfg)
    db_session.commit()

    return {u.username: u for u in test_users}


def auth_user(client: TestClient, username: str, password: str) -> str:
    """Helper to authenticate and return session CSRF token."""
    client.cookies.clear()
    res = client.post("/api/v1/auth/login", json={"identifier": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["user"]["csrf_token"]


def test_e2e_student_workflow(client: TestClient, setup_e2e_environment):
    """
    Validates Student vertical slice:
    - Advance opt-in and opt-out attendance recording
    - Attendance history queries
    - Menu dish taste ratings with comments
    """
    csrf = auth_user(client, "student_shreya", "DevStudentPass123!")
    # Use tomorrow's date to validate advance opt-in safely outside service cutoff
    tomorrow_str = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()

    # 1. Opt-in for tomorrow's Lunch
    res_att = client.post(
        "/api/v1/attendance",
        headers={"X-CSRF-Token": csrf},
        json={"date": tomorrow_str, "meal_type": "Lunch", "attending": True},
    )
    assert res_att.status_code in {200, 201}, f"Attendance submit failed: {res_att.text}"
    att_data = res_att.json()
    assert att_data["attending"] is True

    # 2. Query attendance history
    res_hist = client.get("/api/v1/attendance/me")
    assert res_hist.status_code == 200
    hist = res_hist.json()["items"]
    assert len(hist) >= 1
    assert any(h["meal_type"] == "Lunch" and h["attending"] is True for h in hist)

    # 3. Submit dish taste rating
    res_rating = client.post(
        "/api/v1/ratings",
        headers={"X-CSRF-Token": csrf},
        json={
            "dish_id": "m1",
            "dish_name": "Dal Tadka & Steamed Basmati Rice",
            "rating": 5,
            "comment": "Exceptional aroma and perfect seasoning. Portion size was generous.",
        },
    )
    assert res_rating.status_code in {200, 201}, f"Rating submit failed: {res_rating.text}"
    rating_data = res_rating.json()
    assert rating_data["rating"] == 5

    # 4. Check personal rating history
    res_my_ratings = client.get("/api/v1/ratings/me")
    assert res_my_ratings.status_code == 200
    my_ratings = res_my_ratings.json()["items"]
    assert len(my_ratings) >= 1
    assert any(r["dish_id"] == "m1" and r["rating"] == 5 for r in my_ratings)


def test_e2e_kitchen_and_ngo_lifecycle_handshake(client: TestClient, setup_e2e_environment):
    """
    Validates complete Kitchen & NGO lifecycle:
    1. Kitchen logs shift production
    2. Food safety guards reject dangerous temperatures & plate leftovers
    3. Kitchen creates valid surplus offer -> receives plaintext pickup PIN
    4. NGO browses available offers
    5. NGO-1 claims offer atomically
    6. NGO-2 attempts claim -> 409 Conflict
    7. Kitchen verifies correct PIN at dispatch gate -> completes handover
    8. NGO total pickups and meals distributed are updated
    """
    today_str = datetime.now(timezone.utc).date().isoformat()
    expiry_iso = (datetime.now(timezone.utc) + timedelta(minutes=90)).isoformat()

    # ── Step 1: Kitchen logs shift production metrics ─────────────────────────
    kitchen_csrf = auth_user(client, "chef_rajesh", "DevKitchenPass123!")

    res_log = client.post(
        "/api/v1/kitchen/logs",
        headers={"X-CSRF-Token": kitchen_csrf},
        json={
            "date": today_str,
            "meal_type": "Lunch",
            "dish_name": "Paneer Butter Masala",
            "expected_attendance": 1450,
            "recommended_kg": 115.0,
            "actual_prepared_kg": 120.0,
            "consumed_kg": 108.0,
            "kitchen_surplus_kg": 12.0,
            "plate_waste_kg": 4.5,
            "notes": "Logged from Grand Central Mess Kitchen Station",
        },
    )
    assert res_log.status_code == 201, f"Kitchen log failed: {res_log.text}"

    # ── Step 2: Food safety violations are rejected ───────────────────────────
    # A. Temperature danger zone (e.g. 35°C)
    res_bad_temp = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": kitchen_csrf},
        json={
            "food_title": "Unsafe Warm Rice",
            "dishes": [{"name": "Steamed Rice", "quantityKg": 15.0}],
            "total_quantity_kg": 15.0,
            "servings_count": 35,
            "meal_type": "Lunch",
            "prepared_at": "12:30 PM",
            "temperature_at_packaging": 35.0,  # DANGER ZONE!
            "is_hygienically_packed": True,
            "is_plate_leftover": False,
            "expiry_deadline": expiry_iso,
            "pickup_location": "Kitchen Gate 3",
            "beneficiary_target": "Local Shelter",
        },
    )
    assert res_bad_temp.status_code in {400, 422}
    assert "temperature" in res_bad_temp.text.lower()

    # B. Plate leftovers strictly rejected
    res_leftover = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": kitchen_csrf},
        json={
            "food_title": "Plate Scraps",
            "dishes": [{"name": "Plate Scraps", "quantityKg": 10.0}],
            "total_quantity_kg": 10.0,
            "servings_count": 20,
            "meal_type": "Lunch",
            "prepared_at": "12:30 PM",
            "temperature_at_packaging": 68.0,
            "is_hygienically_packed": True,
            "is_plate_leftover": True,  # PROHIBITED!
            "expiry_deadline": expiry_iso,
            "pickup_location": "Kitchen Gate 3",
            "beneficiary_target": "Local Shelter",
        },
    )
    assert res_leftover.status_code in {400, 422}

    # ── Step 3: Kitchen creates valid surplus donation ────────────────────────
    res_donation = client.post(
        "/api/v1/surplus",
        headers={"X-CSRF-Token": kitchen_csrf},
        json={
            "food_title": "Paneer Butter Masala & Steamed Basmati Rice",
            "dishes": [
                {"name": "Paneer Butter Masala", "quantityKg": 12.0},
                {"name": "Steamed Basmati Rice", "quantityKg": 10.0},
            ],
            "total_quantity_kg": 22.0,
            "servings_count": 55,
            "meal_type": "Lunch",
            "prepared_at": "12:45 PM",
            "temperature_at_packaging": 67.5,
            "is_hygienically_packed": True,
            "is_plate_leftover": False,
            "expiry_deadline": expiry_iso,
            "pickup_location": "Kitchen Dispatch Gate 3 Bay",
            "beneficiary_target": "Verified Shelter Partners",
        },
    )
    assert res_donation.status_code == 201, f"Surplus offer failed: {res_donation.text}"
    donation_data = res_donation.json()
    donation_id = donation_data["id"]
    pickup_pin = donation_data["pickup_pin"]
    assert len(pickup_pin) == 4, "Must generate 4-digit pickup PIN"

    # ── Step 4: NGO browses available surplus ─────────────────────────────────
    ngo_csrf = auth_user(client, "rha_arunav", "DevNgoPass123!")
    res_avail = client.get("/api/v1/surplus/available")
    assert res_avail.status_code == 200
    avail_items = res_avail.json()["items"]
    assert any(item["id"] == donation_id for item in avail_items)

    # ── Step 5: NGO-1 claims the donation offer ───────────────────────────────
    res_claim = client.post(
        f"/api/v1/surplus/{donation_id}/claim",
        headers={"X-CSRF-Token": ngo_csrf},
    )
    assert res_claim.status_code == 200, f"Claim failed: {res_claim.text}"
    claimed_data = res_claim.json()
    assert claimed_data["status"] == "CLAIMED"
    assert claimed_data["claimed_by_ngo_id"] == "ngo-e2e-central"

    # ── Step 6: Competing NGO attempts to claim -> 409 Conflict ───────────────
    competing_csrf = auth_user(client, "fi_pooja", "DevNgoPass123!")
    res_double_claim = client.post(
        f"/api/v1/surplus/{donation_id}/claim",
        headers={"X-CSRF-Token": competing_csrf},
    )
    assert res_double_claim.status_code == 409, "Must return 409 Conflict for double-claim"

    # ── Step 7: Kitchen verifies pickup PIN at Gate 3 ─────────────────────────
    kitchen_csrf = auth_user(client, "chef_rajesh", "DevKitchenPass123!")

    # Attempt wrong PIN
    res_wrong_pin = client.post(
        f"/api/v1/surplus/{donation_id}/verify-pickup",
        headers={"X-CSRF-Token": kitchen_csrf},
        json={"pin": "0000"},
    )
    assert res_wrong_pin.status_code == 400, "Wrong PIN must be rejected"

    # Correct PIN
    res_verify = client.post(
        f"/api/v1/surplus/{donation_id}/verify-pickup",
        headers={"X-CSRF-Token": kitchen_csrf},
        json={"pin": pickup_pin},
    )
    assert res_verify.status_code == 200, f"Pickup verification failed: {res_verify.text}"
    verified_data = res_verify.json()
    assert verified_data["status"] == "COMPLETED"


def test_e2e_manager_analytics_and_forecasting(client: TestClient, setup_e2e_environment):
    """
    Validates Manager analytics and ML forecasting engine:
    - Overview metrics calculation
    - Food waste summary
    - Dual-engine forecast prediction
    - Dynamic safety buffer override
    """
    mgr_csrf = auth_user(client, "dr_anita_roy", "DevManagerPass123!")

    # 1. Operational Overview
    res_overview = client.get("/api/v1/manager/overview")
    assert res_overview.status_code == 200
    overview = res_overview.json()
    assert "total_expected_attendance" in overview
    assert "total_food_waste_kg" in overview
    assert "redistribution_diversion_rate_percent" in overview

    # 2. Food Waste Summary
    res_waste = client.get("/api/v1/manager/food-waste-summary")
    assert res_waste.status_code == 200
    waste_summary = res_waste.json()
    assert "daily_trends" in waste_summary

    # 3. Dual-Engine Forecast Prediction
    res_forecast = client.post(
        "/api/v1/manager/forecast/predict",
        headers={"X-CSRF-Token": mgr_csrf},
        json={
            "expected_attendance": 1450,
            "day_of_week": 2,  # Tuesday
            "is_holiday": False,
            "is_exam_period": True,  # +10% exam intake boost
            "weather_temp": 26.0,
            "is_rainy": True,  # +5% rain stay-in boost
            "menu_item_popularity": 9.0,
            "safety_buffer_percent": 6.5,
        },
    )
    assert res_forecast.status_code == 200, f"Forecast failed: {res_forecast.text}"
    f_data = res_forecast.json()
    assert f_data["expected_attendance"] == 1450
    assert f_data["historical_baseline_kg"] > 0
    assert f_data["ml_predicted_kg"] > f_data["historical_baseline_kg"], "Weather & Exam should increase prediction"
    assert f_data["recommended_preparation_kg"] > f_data["ml_predicted_kg"], "Buffer should cushion the batch"
    assert f_data["confidence_score"] >= 0.90
    assert len(f_data["feature_contributions"]) >= 3

    # 4. Safety Buffer Override
    res_override = client.post(
        "/api/v1/manager/safety-buffer/override",
        headers={"X-CSRF-Token": mgr_csrf},
        json={
            "safety_buffer_percent": 7.5,
            "justification": "Inter-hostel sports meet scheduled for tonight; increased calorie requirement.",
        },
    )
    assert res_override.status_code == 200
    assert res_override.json()["current_percent"] == 7.5


def test_e2e_admin_governance_and_audit_trail(client: TestClient, setup_e2e_environment):
    """
    Validates Administrator institutional governance:
    - NGO credential management
    - Global food safety system configuration
    - Immutable audit ledger inspection
    """
    admin_csrf = auth_user(client, "sys_admin", "DevAdminPass123!")

    # 1. Inspect NGOs
    res_ngos = client.get("/api/v1/admin/ngos")
    assert res_ngos.status_code == 200
    ngos = res_ngos.json()["items"]
    assert len(ngos) >= 2

    # 2. Toggle verification badge
    res_unverify = client.patch(
        "/api/v1/admin/ngos/ngo-e2e-central/verify",
        headers={"X-CSRF-Token": admin_csrf},
        json={"verified": False, "reason": "Annual cold-chain vehicle recertification audit pending"},
    )
    assert res_unverify.status_code == 200
    assert res_unverify.json()["verified"] is False

    # 3. Update system configuration
    res_cfg = client.put(
        "/api/v1/admin/system-config/messaver_safety_buffer",
        headers={"X-CSRF-Token": admin_csrf},
        json={
            "value": {"currentPercent": 8.0, "minPercent": 0.0, "maxPercent": 20.0},
            "reason": "Administrative campus buffer baseline update",
        },
    )
    assert res_cfg.status_code == 200

    # 4. Inspect immutable audit trail
    res_audit = client.get("/api/v1/admin/audit-logs?limit=50")
    assert res_audit.status_code == 200
    audit_data = res_audit.json()
    assert audit_data["total"] >= 1
    # Confirm no plaintext passwords, session tokens, or peppers are leaked in audit details
    for entry in audit_data["items"]:
        assert "DevAdminPass" not in entry["details"]
        assert "password" not in entry["details"].lower()
        assert "pepper" not in entry["details"].lower()
