from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
anync_session = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with anync_session() as session:
        yield session

