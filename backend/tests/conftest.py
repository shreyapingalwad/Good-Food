import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Force testing configuration
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "true"

from app.core.database import Base, get_db
from app.core.rate_limiter import login_tracker
from app.main import app


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset in-memory rate limiter state between tests."""
    with login_tracker._lock:
        login_tracker._ip_attempts.clear()
        login_tracker._account_attempts.clear()
    yield
    with login_tracker._lock:
        login_tracker._ip_attempts.clear()
        login_tracker._account_attempts.clear()


@pytest.fixture(scope="function")
def test_engine():
    """
    Creates an isolated in-memory SQLite engine for unit and schema testing.
    Enforces SQLite foreign keys via PRAGMA.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def do_connect(dbapi_connection, connection_record):
        # Enable foreign key constraint checking in SQLite
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine):
    """
    Provides a transactional database session for each test function.
    """
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """
    Provides a FastAPI TestClient with the get_db dependency overridden
    to use the isolated in-memory test database session.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
