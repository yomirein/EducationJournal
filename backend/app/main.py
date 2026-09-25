import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from sqlalchemy import select, func
from backend.app.api.endpoints import auth, users, courses, streams, panel, files, schedule
from backend.app.core.config import settings
from backend.app.core.security import hash_password
from backend.app.db import SessionLocal
from backend.app.models import User, UserRole

# Application loggers (e.g. "pixelstart.email"); uvicorn keeps its own access/error loggers.
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s - %(message)s")

async def _ensure_first_admin():
    if not (settings.first_admin_username and settings.first_admin_email and settings.first_admin_password):
        return
    async with SessionLocal() as db:
        admin_count = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.admin))
        if admin_count:
            return
        db.add(User(
            first_name=settings.first_admin_first_name,
            last_name=settings.first_admin_last_name,
            username=settings.first_admin_username,
            email=settings.first_admin_email,
            password_hash=hash_password(settings.first_admin_password),
            role=UserRole.admin,
        ))
        await db.commit()
        print(f"[startup] Created first admin: {settings.first_admin_username}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _ensure_first_admin()
    yield


app = FastAPI(title="Learning Platform API", version="1.0.0", lifespan=lifespan)

@app.middleware("http")
async def browser_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# API routers
for router in (
    auth.router,
    users.router,
    courses.router,
    streams.router,
    panel.router,
    panel.stats_router,
    files.router,
    schedule.router,
):
    app.include_router(router)

# Uploads directory
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.api_route("/health", methods=["GET", "HEAD"], tags=["system"])
async def health():
    return {"status": "ok"}


# Frontend static files mount (mounted last as catch-all for web UI)
front_path = Path(__file__).resolve().parents[2] / "front"
if front_path.exists():
    app.mount("/", StaticFiles(directory=str(front_path), html=True), name="front")
