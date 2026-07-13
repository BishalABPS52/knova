from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from core.config import get_database_url, get_settings

settings = get_settings()
engine = create_async_engine(
    get_database_url(async_mode=True),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=20,
    pool_recycle=1800,
    connect_args={"statement_cache_size": 0},
)

AsyncSessionLocal = async_sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
