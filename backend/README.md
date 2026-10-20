# MessSaver Backend — Foundation & Database

Operational backend for MessSaver: Institutional Dining Food Waste Reduction & Redistribution Platform.

Built with **FastAPI**, **SQLAlchemy 2.x**, **Alembic**, and **PostgreSQL** as the authoritative operational database.

---

## Architecture Overview

```
backend/
├── alembic/                      # Alembic database migrations
│   ├── env.py                    # Migration environment connected to Settings & Base.metadata
│   ├── script.py.mako            # Migration template
│   └── versions/                 # Versioned migration scripts
│       └── 0001_initial_schema.py# Initial schema DDL with 8 relational tables & constraints
├── app/
│   ├── api/                      # Operational routers & endpoints
│   │   ├── health.py             # Liveness (/health/live) & Readiness (/health/ready) probes
│   │   └── __init__.py
│   ├── core/                     # Application foundation & configuration
│   │   ├── config.py             # Pydantic BaseSettings requiring explicit DATABASE_URL
│   │   ├── database.py           # Engine pooling, SessionLocal, get_db(), ping_database()
│   │   ├── security.py           # Bcrypt cryptographic hashing for passwords and pickup PINs
│   │   └── __init__.py
│   ├── db/                       # Database tooling
│   │   └── seed.py               # Idempotent development seed tooling with bcrypt hashing
│   ├── models/                   # SQLAlchemy 2.0 declarative models
│   │   ├── base.py               # Declarative Base
│   │   ├── enums.py              # UserRole, MealType, DonationStatus, AuditSeverity
│   │   ├── user.py               # Users & role assignments
│   │   ├── attendance.py         # Student attendance with unique constraint
│   │   ├── dish_rating.py        # Dish ratings with 1-5 range constraint
│   │   ├── kitchen_log.py        # Kitchen production & segregated surplus/plate waste logs
│   │   ├── ngo.py                # Verified NGO partner registry & impact metrics
│   │   ├── donation.py           # Surplus donations & claims with hashed PIN
│   │   ├── audit.py              # Operational audit event trail
│   │   ├── system_config.py      # Central operational parameter configuration
│   │   └── __init__.py
│   ├── schemas/                  # Pydantic v2 validation models
│   │   ├── health.py             # Liveness and readiness response schemas
│   │   ├── user.py               # User create/read schemas (hash strictly excluded from read)
│   │   ├── attendance.py         # Attendance request/response schemas
│   │   ├── dish_rating.py        # Rating request/response schemas
│   │   ├── kitchen.py            # Kitchen log schemas with positive number validation
│   │   ├── ngo.py                # NGO partner schemas
│   │   ├── donation.py           # Surplus donation schemas (food safety & hash hidden)
│   │   ├── audit.py              # Audit event schemas
│   │   ├── system_config.py      # System config schemas
│   │   └── __init__.py
│   └── main.py                   # FastAPI factory, CORS, and sanitized exception handlers
├── tests/                        # Automated test suite (19 tests)
│   ├── conftest.py               # Isolated in-memory SQLite fixtures & TestClient
│   ├── test_config.py            # Settings validation & URL normalization
│   ├── test_health.py            # /health/live and /health/ready (connected/disconnected)
│   ├── test_models.py            # Relational models, constraints, and hashes
│   ├── test_seed.py              # Seed populating, idempotency, and production safeguards
│   └── test_session_lifecycle.py # Session lifecycle and database pings
├── .env.example                  # Environment configuration template
├── alembic.ini                   # Alembic configuration file
├── pytest.ini                    # Pytest configuration
├── requirements.txt              # Production and development dependencies
└── run_dev.py                    # Safe development server launcher
```

---

## Quickstart & Local Setup

### 1. Prerequisites
- **Python 3.11+**
- **PostgreSQL 14+** (for authoritative shared operational database)

### 2. Environment Configuration
Create a local `.env` file in the `backend/` directory from `.env.example`:

```bash
cd backend
cp .env.example .env
```

Edit `.env` to configure your local PostgreSQL database URL. No usable default password or insecure fallback is accepted:

```ini
ENVIRONMENT=development
DEBUG=true

# Authoritative operational PostgreSQL database
DATABASE_URL=postgresql+psycopg://messaver_user:YOUR_LOCAL_PASSWORD@localhost:5432/messaver_db
```

### 3. Virtual Environment Setup
```bash
# Windows
py -3.11 -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Database Provisioning & Migrations
Ensure your local PostgreSQL database exists:
```sql
CREATE DATABASE messaver_db;
```

Run migrations using Alembic:
```bash
alembic upgrade head
```

To inspect generated SQL without connecting to the database:
```bash
alembic upgrade head --sql
```

### 5. Idempotent Development Seeding
Populate initial NGOs, surplus donations, kitchen logs, audit events, and development test accounts:
```bash
python -m app.db.seed
```
*Note: Seed tooling is strictly prohibited in `ENVIRONMENT=production` to prevent default credential creation.*

### 6. Start the Development Server
```bash
python run_dev.py
```
Or with uvicorn directly:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation will be available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

---

## Health Check Endpoints

| Endpoint | Method | Expected Status | Description |
|---|---|---|---|
| `/health/live` | GET | `200 OK` | Process liveness probe. Returns `{"status": "ok", "app": "...", "version": "1.0.0"}` |
| `/health/ready` | GET | `200 OK` / `503 Service Unavailable` | Operational database probe. Executes `SELECT 1`. Returns 503 if disconnected without leaking credentials or stack traces. |

---

## Automated Tests

Run the test suite using pytest:
```bash
pytest -v
```

The test suite executes 19 automated tests in isolated in-memory SQLite:
1. Application configuration and required `DATABASE_URL` validation.
2. Model schema constraints (unique attendance, 1–5 dish ratings, positive waste metrics).
3. Food safety check constraint (`is_plate_leftover = false` invariant).
4. Bcrypt cryptographic hashing for passwords and pickup PINs.
5. Database session lifecycle and connection pool pinging.
6. Liveness (`/health/live`) and readiness (`/health/ready`) probes (healthy and simulated outage).
7. Seed execution, idempotency, and production safety guards.

---

## Security Invariants

- **No Plaintext Secrets**: Passwords and 4-digit pickup PINs are hashed using `bcrypt` (12 rounds) before persistence.
- **No Unsafe Fallbacks**: `DATABASE_URL` is required and will fail fast at startup if missing or empty.
- **No Production Default Accounts**: `app.db.seed` refuses execution when `ENVIRONMENT=production`.
- **Zero Information Leakage**: Exception handlers intercept unhandled errors and return generic 500 error envelopes without debug stack traces.
