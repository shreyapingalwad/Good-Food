import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.core.config import get_settings

logger = logging.getLogger("messaver.backend")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    Validates configuration at startup.
    """
    settings = get_settings()
    logger.info(f"Starting {settings.PROJECT_NAME} in '{settings.ENVIRONMENT}' mode...")
    yield
    logger.info("Shutting down MessSaver backend cleanly...")


def create_application() -> FastAPI:
    """
    Application factory for MessSaver FastAPI backend.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.PROJECT_NAME,
        description="MessSaver Operational Backend - Institutional Food Waste Reduction & Redistribution Platform",
        version="1.0.0",
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan
    )

    # CORS configuration for institutional dining portals and configurable origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Global unhandled exception handler: NEVER leak stack traces to client responses
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": "An internal server error occurred. Please contact the administrator."
            }
        )

    # Mount Health and Operational Probes
    app.include_router(health_router)

    # Mount Authentication and Session Endpoints
    app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth")
    app.include_router(auth_router, prefix="/auth")

    return app


app = create_application()
