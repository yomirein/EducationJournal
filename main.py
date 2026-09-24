from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from backend.app.api.endpoints import auth, users, courses, streams, panel, files, schedule
from backend.app.core.config import settings

app = FastAPI(title="Learning Platform API", version="1.0.0")

# CORS middleware for seamless frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
front_path = Path(__file__).resolve().parent / "front"
if front_path.exists():
    app.mount("/", StaticFiles(directory=str(front_path), html=True), name="front")
