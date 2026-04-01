from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings

settings = get_settings()

# Convert DATABASE_URL to async driver explicitly
_db_url = settings.database_url
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgresql://") and "+asyncpg" not in _db_url:
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create async engine with production-ready connection pooling
engine = create_async_engine(
    _db_url,
    echo=settings.dev_mode,  # Only echo SQL in dev mode
    future=True,
    pool_size=20,          # Maintain 20 persistent connections
    max_overflow=20,       # Allow 20 additional connections under load (total: 40)
    pool_pre_ping=True,    # Verify connections are alive before use (prevents stale connection errors)
    pool_recycle=3600,     # Recycle connections after 1 hour (prevents PostgreSQL idle timeout)
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
