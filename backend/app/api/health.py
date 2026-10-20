import logging
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db, ping_database
from app.schemas.health import LivenessResponse, ReadinessResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


@router.get(
    "/health/live",
    response_model=LivenessResponse,
    status_code=status.HTTP_200_OK,
    summary="Process Liveness Check"
)
def liveness() -> LivenessResponse:
    """
    Returns 200 OK if the FastAPI process is running and responding to requests.
    Does not depend on external systems or databases.
    """
    settings = get_settings()
    return LivenessResponse(
        status="ok",
        app=settings.PROJECT_NAME,
        version="1.0.0"
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    responses={
        status.HTTP_200_OK: {"description": "Application and database are ready"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "Database is unavailable or not ready"}
    },
    summary="Operational Database Readiness Check"
)
def readiness(db: Session = Depends(get_db)):
    """
    Returns 200 OK if the application is connected to the operational database.
    Returns 503 Service Unavailable if the database cannot be queried.
    Never exposes credentials or stack traces in failure responses.
    """
    settings = get_settings()
    is_db_ready = ping_database(db)

    if not is_db_ready:
        logger.warning("Readiness probe failed: database ping returned False")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "database": "disconnected",
                "environment": settings.ENVIRONMENT,
                "message": "Database ping failed. Ensure PostgreSQL is running and migrations are applied."
            }
        )

    return ReadinessResponse(
        status="ready",
        database="connected",
        environment=settings.ENVIRONMENT,
        message="Operational database is accessible and responding"
    )
