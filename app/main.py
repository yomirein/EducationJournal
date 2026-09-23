from fastapi import FastAPI
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine

app = FastAPI(title="test backend")
app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
