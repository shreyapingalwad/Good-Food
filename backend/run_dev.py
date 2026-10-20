import sys
import uvicorn
from app.core.config import get_settings


def main():
    """
    Safe local development server launcher for MessSaver backend.
    Validates environment settings prior to starting uvicorn.
    """
    try:
        settings = get_settings()
    except Exception as e:
        print(f"\n[ERROR] Backend configuration error: {e}")
        print("\nPlease ensure DATABASE_URL is set in backend/.env or your system environment variables.")
        print("Example: DATABASE_URL=postgresql+psycopg://messaver_user:secure_password@localhost:5432/messaver_db\n")
        sys.exit(1)

    print(f"Starting MessSaver backend on http://{settings.API_HOST}:{settings.API_PORT} ({settings.ENVIRONMENT})")
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=(settings.ENVIRONMENT != "production"),
        log_level="info"
    )


if __name__ == "__main__":
    main()
