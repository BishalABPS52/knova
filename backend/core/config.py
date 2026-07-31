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

    # External LLM providers for content generation. Google is primary,
    # OpenRouter is the fallback; a provider with an empty key is skipped.
    GOOGLE_API_KEY: str = ""
    GOOGLE_GENAI_MODEL: str = "gemini-2.5-flash"
    GOOGLE_GENAI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    # OpenRouter attributes usage to these (sent as HTTP-Referer / X-Title).
    OPENROUTER_APP_URL: str = "https://knova.app"
    OPENROUTER_APP_TITLE: str = "Knova"

    LLM_TIMEOUT_SECONDS: float = 60.0
    LLM_MAX_ATTEMPTS: int = 2      # per provider, before falling through
    LLM_TEMPERATURE: float = 0.7

    # MCQ quiz generation (background job fired when a topic is created)
    QUIZ_AUTOGEN_ENABLED: bool = True
    QUIZ_MCQ_PER_TOPIC: int = 5
    QUIZ_MCQ_MAX_PER_REQUEST: int = 20
    # System account generated questions are attributed to (created on first run).
    QUIZ_BOT_EMAIL: str = "quizbot@knova.internal"
    QUIZ_BOT_USERNAME: str = "Knova Quiz Bot"


@lru_cache
def get_settings():
    global settings
    if settings is None:
        settings = Settings()
    return settings