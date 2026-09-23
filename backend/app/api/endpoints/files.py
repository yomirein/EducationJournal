from pathlib import Path
from uuid import uuid4
import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from backend.app.api.deps import get_current_user
from backend.app.core.config import settings

router = APIRouter(prefix="/files", tags=["files"])
MAX_FILE_SIZE = 20 * 1024 * 1024


@router.post("", status_code=201)
async def upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not file.filename: raise HTTPException(422, "Filename is required")
    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE: raise HTTPException(413, "File exceeds 20 MiB")
    path = Path(settings.upload_dir); path.mkdir(parents=True, exist_ok=True)
    key = f"{uuid4().hex}_{Path(file.filename).name}"
    async with aiofiles.open(path / key, "wb") as destination:
        await destination.write(content)
    return {"file_id": key, "url": f"/uploads/{key}"}
