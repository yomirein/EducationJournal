from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from backend.app.api.endpoints import auth, users, courses, streams, panel, files, schedule
from backend.app.core.config import settings

app = FastAPI(title="Learning Platform API", version="1.0.0")
for router in (auth.router, users.router, courses.router, streams.router, panel.router, panel.stats_router, files.router, schedule.router):
    app.include_router(router)
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/health", tags=["system"])
async def health(): return {"status": "ok"}
