import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Base class for all SQLAlchemy declarative models
Base = declarative_base()

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine(db_url: str | None = None) -> Engine:
    """
    Returns or initializes the SQLAlchemy engine with appropriate pooling.
    """
    global _engine
    if _engine is not None and db_url is None:
        return _engine

    settings = get_settings()
    url = db_url or settings.DATABASE_URL

    connect_args = {}
    is_sqlite = url.startswith("sqlite")

    if is_sqlite:
        connect_args["check_same_thread"] = False
        engine = create_engine(
            url,
            connect_args=connect_args,
            echo=settings.DEBUG,
            pool_pre_ping=True
        )
    else:
        # Standard PostgreSQL pool configuration
        engine = create_engine(
            url,
            connect_args=connect_args,
            echo=settings.DEBUG,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=1800
        )

    if db_url is None:
        _engine = engine
    return engine


def get_session_factory(engine: Engine | None = None) -> sessionmaker[Session]:
    """
    Returns or initializes the sessionmaker factory.
    """
    global _SessionLocal
    if _SessionLocal is not None and engine is None:
        return _SessionLocal

    active_engine = engine or get_engine()
    factory = sessionmaker(autocommit=False, autoflush=False, bind=active_engine)
    if engine is None:
        _SessionLocal = factory
    return factory


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session and ensures clean closure.
    """
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


def ping_database(db: Session) -> bool:
    """
    Executes a lightweight query (SELECT 1) to verify database liveness and readiness.
    """
    try:
        result = db.execute(text("SELECT 1"))
        return result.scalar() == 1
    except Exception as e:
        logger.warning(f"Database health ping failed: {e}")
        return False
