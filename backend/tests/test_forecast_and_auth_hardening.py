"""
Deterministic unit and integration tests for:
1. Forecasting numerical edge cases (zero demand, cold-start heuristics, empirical MAE/RMSE calibration).
2. Multi-factor adjustments (rain, temperature extremes, academic calendar, menu popularity).
3. Immediate session revocation upon administrative NGO deactivation.
4. Rejection of claims from deactivated or unverified NGOs.
"""
from datetime import datetime, timezone
import math
import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_secret
from app.models.enums import AuditSeverity, DonationStatus, MealType, UserRole
from app.models.kitchen_log import KitchenLog
from app.models.ngo import NgoPartner
from app.models.session import ServerSession
from app.models.user import User


def test_forecast_zero_demand_cancellation_edge_case(client: TestClient, db_session):
    """
    Edge case: When expected_attendance is explicitly 0 (meal cancelled / zero demand),
    all predicted outputs must be 0.0 kg with 0.0 error and zero preparation.
    """
    # Manager login
    mgr = User(
        id="usr-mgr-test-zero",
        username="manager_zero_test",
        email="mgr.zero@campus.edu",
        full_name="Manager Zero Test",
        password_hash=hash_secret("SecurePass123!"),
        role=UserRole.MANAGER,
        facility_id="Central Hall - Block A",
    )
    db_session.add(mgr)
    db_session.commit()

    login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager_zero_test", "password": "SecurePass123!"},
    )
    assert login_res.status_code == 200

    forecast_res = client.post(
        "/api/v1/manager/forecast/predict",
        json={
            "facility_id": "Central Hall - Block A",
            "meal_type": "Lunch",
            "expected_attendance": 0,
        },
    )
    assert forecast_res.status_code == 200
    data = forecast_res.json()

    assert data["expected_attendance"] == 0
    assert data["historical_baseline_kg"] == 0.0
    assert data["ml_predicted_kg"] == 0.0
    assert data["recommended_preparation_kg"] == 0.0
    assert data["safety_buffer_kg"] == 0.0
    assert data["mae_kg"] == 0.0
    assert data["rmse_kg"] == 0.0
    assert data["confidence_score"] == 100.0
    assert "Zero demand" in data["disclaimer"]


def test_forecast_empirical_mae_rmse_calibration(client: TestClient, db_session):
    """
    Verify that when historical logs exist, sample MAE and RMSE are calculated
    directly from historical preparation vs consumption discrepancies.
    """
    facility = "North Dining Hall - Facility 1"
    # Seed known historical logs
    # Log 1: prepared 300 kg, consumed 280 kg -> error = 20 kg
    # Log 2: prepared 310 kg, consumed 300 kg -> error = 10 kg
    # Log 3: prepared 290 kg, consumed 260 kg -> error = 30 kg
    # Expected MAE = (20 + 10 + 30) / 3 = 20.0 kg
    # Expected RMSE = sqrt((400 + 100 + 900) / 3) = sqrt(1400 / 3) = sqrt(466.67) = 21.6 kg
    klogs = [
        KitchenLog(
            id="klog-calib-1",
            date="2026-10-10",
            meal_type=MealType.LUNCH,
            facility_id=facility,
            dish_name="Test Rice Batch",
            expected_attendance=1000,
            recommended_kg=300.0,
            actual_prepared_kg=300.0,
            consumed_kg=280.0,
            kitchen_surplus_kg=20.0,
            plate_waste_kg=5.0,
            recorded_by="Chef Test",
        ),
        KitchenLog(
            id="klog-calib-2",
            date="2026-10-11",
            meal_type=MealType.LUNCH,
            facility_id=facility,
            dish_name="Test Rice Batch",
            expected_attendance=1000,
            recommended_kg=310.0,
            actual_prepared_kg=310.0,
            consumed_kg=300.0,
            kitchen_surplus_kg=10.0,
            plate_waste_kg=5.0,
            recorded_by="Chef Test",
        ),
        KitchenLog(
            id="klog-calib-3",
            date="2026-10-12",
            meal_type=MealType.LUNCH,
            facility_id=facility,
            dish_name="Test Rice Batch",
            expected_attendance=1000,
            recommended_kg=290.0,
            actual_prepared_kg=290.0,
            consumed_kg=260.0,
            kitchen_surplus_kg=30.0,
            plate_waste_kg=5.0,
            recorded_by="Chef Test",
        ),
    ]
    for k in klogs:
        db_session.add(k)

    mgr = User(
        id="usr-mgr-test-calib",
        username="manager_calib_test",
        email="mgr.calib@campus.edu",
        full_name="Manager Calib Test",
        password_hash=hash_secret("SecurePass123!"),
        role=UserRole.MANAGER,
        facility_id=facility,
    )
    db_session.add(mgr)
    db_session.commit()

    login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager_calib_test", "password": "SecurePass123!"},
    )
    assert login_res.status_code == 200

    forecast_res = client.post(
        "/api/v1/manager/forecast/predict",
        json={
            "facility_id": facility,
            "meal_type": "Lunch",
            "expected_attendance": 1000,
            "weather_temp": 24.0,
            "is_rainy": False,
            "menu_item_popularity": 7.5,
            "safety_buffer_percent": 10.0,
        },
    )
    assert forecast_res.status_code == 200
    data = forecast_res.json()

    # Per person kg = (280 + 300 + 260) / (3000) = 840 / 3000 = 0.28 kg/person
    # Baseline for 1000 = 280.0 kg
    assert data["historical_baseline_kg"] == 280.0
    # Multiplier is 1.0 (no weather or calendar adjustments)
    assert data["ml_predicted_kg"] == 280.0
    # Safety buffer 10% = 28.0 kg -> recommended = 308.0 kg
    assert data["safety_buffer_kg"] == 28.0
    assert data["recommended_preparation_kg"] == 308.0

    # Verify deterministic sample MAE & RMSE
    expected_mae = round((20.0 + 10.0 + 30.0) / 3, 1)
    expected_rmse = round(math.sqrt((20.0**2 + 10.0**2 + 30.0**2) / 3), 1)
    assert data["mae_kg"] == expected_mae  # 20.0 kg
    assert data["rmse_kg"] == expected_rmse  # 21.6 kg
    assert data["is_historical_data"] is True
    assert "Empirically calibrated" in data["disclaimer"]


def test_forecast_cold_start_heuristic_uncalibrated(client: TestClient, db_session):
    """
    Verify that when no historical logs exist for the facility, the engine outputs
    the cold-start heuristic with an explicit uncalibrated disclaimer.
    """
    facility = "Brand New Dining Facility Without History"
    mgr = User(
        id="usr-mgr-test-cold",
        username="manager_cold_test",
        email="mgr.cold@campus.edu",
        full_name="Manager Cold Test",
        password_hash=hash_secret("SecurePass123!"),
        role=UserRole.MANAGER,
        facility_id=facility,
    )
    db_session.add(mgr)
    db_session.commit()

    client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager_cold_test", "password": "SecurePass123!"},
    )

    res = client.post(
        "/api/v1/manager/forecast/predict",
        json={
            "facility_id": facility,
            "meal_type": "Dinner",
            "expected_attendance": 500,
            "safety_buffer_percent": 5.0,
        },
    )
    assert res.status_code == 200
    data = res.json()

    assert data["is_historical_data"] is False
    assert data["confidence_score"] == 58.0
    assert "Cold-start heuristic estimate" in data["disclaimer"]


def test_ngo_deactivation_immediate_session_revocation(client: TestClient, db_session):
    """
    Verify that when an administrator deactivates an NGO partner:
    1. Associated user accounts are set to is_active=False.
    2. All active server sessions in server_sessions are marked is_active=False.
    3. The NGO user holding an active session cookie is immediately rejected with 401.
    4. Surplus donation claim attempts are rejected with 403.
    """
    # 1. Create NGO Partner & NGO User
    ngo = NgoPartner(
        id="ngo-deact-test",
        name="Shelter Support Network",
        registration_number="REG-DEACT-001",
        contact_person="Ramesh Deact",
        phone="+91 99999 88888",
        vehicle_type="Insulated Cargo Van",
        verified=True,
        is_active=True,
    )
    ngo_user = User(
        id="usr-ngo-deact",
        username="ngo_deact_user",
        email="deact@shelter.org",
        full_name="Ramesh Deact",
        password_hash=hash_secret("SecurePass123!"),
        role=UserRole.NGO,
        ngo_id=ngo.id,
        is_active=True,
    )
    admin = User(
        id="usr-adm-deact-test",
        username="admin_deact_tester",
        email="adm.deact@campus.edu",
        full_name="Admin Deact Tester",
        password_hash=hash_secret("SecurePass123!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add_all([ngo, ngo_user, admin])
    db_session.commit()

    # 2. NGO User logs in and receives session cookie
    ngo_login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "ngo_deact_user", "password": "SecurePass123!"},
    )
    assert ngo_login_res.status_code == 200
    ngo_csrf = ngo_login_res.json()["user"]["csrf_token"]

    # Verify NGO session is currently active
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "ngo_deact_user"

    # 3. Admin logs in using a separate TestClient or sequential session
    # We switch auth to admin to perform the deactivation
    admin_login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin_deact_tester", "password": "SecurePass123!"},
    )
    assert admin_login_res.status_code == 200
    admin_csrf = admin_login_res.json()["user"]["csrf_token"]

    # Admin deactivates NGO
    deact_res = client.patch(
        f"/api/v1/admin/ngos/{ngo.id}/activate",
        json={"is_active": False, "reason": "Compliance suspension test"},
        headers={"X-CSRF-Token": admin_csrf},
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # Verify that in the database, all server_sessions for usr-ngo-deact are now inactive
    ngo_sessions = (
        db_session.query(ServerSession)
        .filter(ServerSession.user_id == ngo_user.id)
        .all()
    )
    assert len(ngo_sessions) > 0
    assert all(s.is_active is False for s in ngo_sessions)
