# Configurations for the knova-backend

from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

settings = None

# Points to the backend/ directory (this file lives in backend/core/)
BASE_DIR = Path(__file__).resolve().parent.parent


def get_database_url(async_mode: bool = False) -> str:
    url = str(get_settings().DATABASE_URL).strip()
    if not url:
        return url

    if async_mode:
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql+psycopg2://"):
            return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql+psycopg://"):
            return url.replace("postgresql+psycopg://", "postgresql+asyncpg://", 1)

    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    DEBUG: bool = True

    DATABASE_URL: str = ""
    REDIS_URL: str = ""

    SECRET_KEY: str = "insecure-SpJAPDzPloydQoB8IxprCO-yvjrnGBDE-RMA"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES:  int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 24 * 60

    # Exact frontend origins allowed by CORS. Cannot be ["*"] because
    # allow_credentials=True forbids the wildcard. Override in prod via the
    # ALLOW_ORIGINS env var, e.g. '["https://your-app.vercel.app"]'.
    ALLOW_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # ML model artifacts (overridable via ML_MODELS_PATH / ML_DATA_PATH env vars)
    ML_MODELS_PATH: Path = BASE_DIR / "models"
    ML_DATA_PATH: Path = BASE_DIR / "data"


@lru_cache
def get_settings():
    global settings
    if settings is None:
        settings = Settings()
    return settings