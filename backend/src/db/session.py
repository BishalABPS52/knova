from uuid import uuid4

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from core.config import get_database_url, get_settings

settings = get_settings()
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=20,
    pool_recycle=1800,
    # Supabase's transaction pooler (pgbouncer) doesn't support asyncpg's
    # cached prepared statements; disable the cache and use unique names.
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
    },
)

AsyncSessionLocal = async_sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
