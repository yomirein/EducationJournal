import asyncio
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from backend.app.core.config import settings
from backend.app.models import Base

config = context.config
target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction(): context.run_migrations()


def do_run(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction(): context.run_migrations()


async def run_async():
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as connection: await connection.run_sync(do_run)
    await engine.dispose()


if context.is_offline_mode(): run_migrations_offline()
else: asyncio.run(run_async())
