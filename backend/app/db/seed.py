import logging
import sys
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_engine, get_session_factory
from app.core.security import hash_secret
from app.models.enums import AuditSeverity, DonationStatus, MealType, UserRole
from app.models.ngo import NgoPartner
from app.models.donation import SurplusDonation
from app.models.kitchen_log import KitchenLog
from app.models.audit import AuditEvent
from app.models.system_config import SystemConfig
from app.models.user import User

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed")


def seed_database(db: Session, environment: str = "development") -> dict:
    """
    Idempotent development seed utility.
    Populates initial NGOs, Surplus Donations, Kitchen Logs, Audits, and Dev Users.
    Guarantees:
    - Never runs in production environments.
    - Idempotent: skips or updates existing rows by primary key without throwing unique errors.
    - Passwords and pickup PINs are cryptographically hashed using bcrypt.
    """
    if environment.lower() == "production":
        raise RuntimeError(
            "CRITICAL: Seed execution is strictly prohibited in production environments. "
            "Never create default test accounts or known credentials in production."
        )

    logger.info("Beginning idempotent seed operation...")
    stats = {"ngos": 0, "donations": 0, "kitchen_logs": 0, "audits": 0, "configs": 0, "users": 0}

    # 1. Seed Verified NGOs (matching storageService.ts SEED_NGOS)
    seed_ngos = [
        NgoPartner(
            id="ngo-1",
            name="Robin Hood Army - South Campus Wing",
            registration_number="NGO-DEL-89241",
            contact_person="Arunav Sharma",
            phone="+91 98112 43210",
            vehicle_type="Insulated Van (Refrigerated 4°C - 10°C)",
            verified=True,
            verification_badge="Verified Tier 1 Cold-Chain Partner",
            total_pickups_completed=142,
            meals_distributed=18450,
        ),
        NgoPartner(
            id="ngo-2",
            name="Annapurna Seva Trust",
            registration_number="NGO-MAH-44102",
            contact_person="Sunita Deshmukh",
            phone="+91 98230 77119",
            vehicle_type="Covered Electric Cargo Carrier",
            verified=True,
            verification_badge="Verified Rapid Community Response",
            total_pickups_completed=88,
            meals_distributed=11200,
        ),
        NgoPartner(
            id="ngo-3",
            name="Food For All Youth Shelter Coalition",
            registration_number="NGO-KA-31290",
            contact_person="Karan Mehra",
            phone="+91 97410 99421",
            vehicle_type="Temperature Insulated Crates (Hot Hold)",
            verified=True,
            verification_badge="Verified Youth Shelter Distro",
            total_pickups_completed=64,
            meals_distributed=8750,
        ),
    ]

    for ngo in seed_ngos:
        existing = db.query(NgoPartner).filter(NgoPartner.id == ngo.id).first()
        if not existing:
            db.add(ngo)
            stats["ngos"] += 1

    db.flush()

    # 2. Seed Surplus Donations (matching storageService.ts INITIAL_DONATIONS)
    # Note: PINs 4829 and 9133 are hashed before insertion. Plaintext PINs are NEVER stored.
    seed_donations = [
        SurplusDonation(
            id="DON-8841",
            food_title="Steamed Basmati Rice & Paneer Curry (Unserved Batch)",
            dishes=[
                {"name": "Basmati Rice", "quantityKg": 18.5},
                {"name": "Paneer Butter Masala", "quantityKg": 14.0},
                {"name": "Dal Tadka", "quantityKg": 12.5},
            ],
            total_quantity_kg=45.0,
            servings_count=110,
            meal_type=MealType.LUNCH,
            prepared_at="12:15 PM",
            temperature_at_packaging=68.5,
            is_hygienically_packed=True,
            is_plate_leftover=False,
            expiry_deadline=datetime.utcnow().isoformat(),
            status=DonationStatus.AVAILABLE,
            pickup_pin_hash=hash_secret("4829"),
            kitchen_facility="Grand Central Mess - Block B",
            pickup_location="Kitchen Dispatch Gate 3 (Cold Bay)",
            beneficiary_target="Local Night Shelters & Senior Citizens Home",
            image_url="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
        ),
        SurplusDonation(
            id="DON-8840",
            food_title="Mixed Vegetable Biryani & Raita (Hot Container)",
            dishes=[
                {"name": "Subz Biryani", "quantityKg": 22.0},
                {"name": "Jeera Raita", "quantityKg": 8.0},
            ],
            total_quantity_kg=30.0,
            servings_count=75,
            meal_type=MealType.DINNER,
            prepared_at="Yesterday, 08:30 PM",
            temperature_at_packaging=66.0,
            is_hygienically_packed=True,
            is_plate_leftover=False,
            expiry_deadline=datetime.utcnow().isoformat(),
            status=DonationStatus.COMPLETED,
            claimed_by_ngo_id="ngo-1",
            claimed_by_ngo_name="Robin Hood Army - South Campus Wing",
            claimed_at="Yesterday, 09:10 PM",
            pickup_pin_hash=hash_secret("9133"),
            completed_at="Yesterday, 09:48 PM",
            kitchen_facility="Grand Central Mess - Block B",
            pickup_location="Kitchen Dispatch Gate 3",
            beneficiary_target="Railway Colony Slum Community",
            image_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
        ),
    ]

    for donation in seed_donations:
        existing = db.query(SurplusDonation).filter(SurplusDonation.id == donation.id).first()
        if not existing:
            db.add(donation)
            stats["donations"] += 1

    # 3. Seed Kitchen Logs (matching storageService.ts)
    seed_klogs = [
        KitchenLog(
            id="klog-101",
            date=datetime.utcnow().strftime("%Y-%m-%d"),
            meal_type=MealType.BREAKFAST,
            dish_name="Idli Sambar & Coconut Chutney",
            expected_attendance=1420,
            recommended_kg=284.0,
            actual_prepared_kg=290.0,
            consumed_kg=278.0,
            kitchen_surplus_kg=12.0,
            plate_waste_kg=6.5,
            recorded_by="Chef Ramesh",
            image_url="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
        )
    ]

    for klog in seed_klogs:
        existing = db.query(KitchenLog).filter(KitchenLog.id == klog.id).first()
        if not existing:
            db.add(klog)
            stats["kitchen_logs"] += 1

    # 4. Seed Audit Logs (matching storageService.ts INITIAL_AUDITS)
    seed_audits = [
        AuditEvent(
            id="log-1",
            timestamp="12:00 PM",
            actor_name="Chef Rajesh Kumar",
            actor_role=UserRole.KITCHEN,
            action="LOG_SURPLUS_DISPATCH",
            details="Logged 45.0 kg surplus food (DON-8841). Temperature verified at 68.5°C. Plate scraps check: Zero (Passed).",
            severity=AuditSeverity.SUCCESS,
        ),
        AuditEvent(
            id="log-2",
            timestamp="11:20 AM",
            actor_name="Dr. Anita Roy",
            actor_role=UserRole.MANAGER,
            action="OVERRIDE_BUFFER",
            details="Adjusted safety buffer to 4.5% for Lunch service due to rain forecast and campus seminar opt-ins.",
            severity=AuditSeverity.INFO,
        ),
        AuditEvent(
            id="log-3",
            timestamp="10:30 AM",
            actor_name="Robin Hood Army Dispatcher",
            actor_role=UserRole.NGO,
            action="CONFIRM_HANDOVER",
            details="Completed handover of 30.0 kg Biryani batch (DON-8840) at Gate 3 with PIN verification.",
            severity=AuditSeverity.SUCCESS,
        ),
    ]

    for audit in seed_audits:
        existing = db.query(AuditEvent).filter(AuditEvent.id == audit.id).first()
        if not existing:
            db.add(audit)
            stats["audits"] += 1

    # 5. Seed System Configuration
    seed_configs = [
        SystemConfig(
            key="messaver_safety_buffer",
            value={"defaultPercent": 5.0, "minPercent": 1.0, "maxPercent": 20.0},
            description="Operational safety buffer percentage over baseline predicted headcount",
            updated_by="system_init",
        ),
        SystemConfig(
            key="messaver_meal_cutoffs",
            value={
                "Breakfast": "07:30 AM",
                "Lunch": "11:30 AM",
                "Snacks": "04:00 PM",
                "Dinner": "06:00 PM",
            },
            description="Student attendance opt-in/opt-out cutoff deadlines",
            updated_by="system_init",
        ),
    ]

    for config in seed_configs:
        existing = db.query(SystemConfig).filter(SystemConfig.key == config.key).first()
        if not existing:
            db.add(config)
            stats["configs"] += 1

    # 6. Seed Development Demo Users (with bcrypt hashed passwords)
    # strictly for local developer convenience
    dev_users = [
        User(
            id="usr-std-101",
            username="student_shreya",
            email="student.shreya@campus.edu",
            full_name="Shreya Pingalwad",
            password_hash=hash_secret("DevStudentPass123!"),
            role=UserRole.STUDENT,
            facility_id="Grand Central Mess - Block B",
        ),
        User(
            id="usr-chef-101",
            username="chef_rajesh",
            email="rajesh.kumar@messaver.org",
            full_name="Chef Rajesh Kumar",
            password_hash=hash_secret("DevKitchenPass123!"),
            role=UserRole.KITCHEN,
            facility_id="Grand Central Mess - Block B",
        ),
        User(
            id="usr-mgr-101",
            username="dr_anita_roy",
            email="anita.roy@campus.edu",
            full_name="Dr. Anita Roy",
            password_hash=hash_secret("DevManagerPass123!"),
            role=UserRole.MANAGER,
            facility_id="Grand Central Mess - Block B",
        ),
        User(
            id="usr-ngo-101",
            username="rha_arunav",
            email="arunav@robinhoodarmy.org",
            full_name="Arunav Sharma",
            password_hash=hash_secret("DevNgoPass123!"),
            role=UserRole.NGO,
            ngo_id="ngo-1",
        ),
        User(
            id="usr-adm-101",
            username="sys_admin",
            email="admin@campus.edu",
            full_name="Campus Dining System Administrator",
            password_hash=hash_secret("DevAdminPass123!"),
            role=UserRole.ADMIN,
        ),
    ]

    for user in dev_users:
        existing = db.query(User).filter(User.username == user.username).first()
        if not existing:
            db.add(user)
            stats["users"] += 1

    db.commit()
    logger.info(f"Database seed completed successfully: {stats}")
    return stats


if __name__ == "__main__":
    settings = get_settings()
    engine = get_engine()
    SessionFactory = get_session_factory(engine)
    with SessionFactory() as session:
        seed_database(session, environment=settings.ENVIRONMENT)
