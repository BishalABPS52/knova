from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from core.config import get_settings

settings = get_settings()
engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20, pool_timeout=20, pool_recycle=1800)

AsyncSessionLocal = async_sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
