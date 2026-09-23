from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import require_role
from backend.app.db import get_session
from backend.app.models import UserRole, User, Course, Stream, Module, Lesson, Task, StreamParticipant, Submission, StreamRating
from backend.app.schemas import CourseCreate, CourseUpdate, CourseOut, StreamCreate, StreamOut, LessonCreate, TaskCreate

router = APIRouter(prefix="/panel", tags=["panel"], dependencies=[Depends(require_role(UserRole.admin))])
stats_router = APIRouter(prefix="/panel/stats", tags=["stats"], dependencies=[Depends(require_role(UserRole.admin, UserRole.curator))])


@router.get("/users")
async def users(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0), role: UserRole | None = None, db: AsyncSession = Depends(get_session)):
    q = select(User).limit(limit).offset(offset)
    if role: q = q.where(User.role == role)
    return list((await db.scalars(q)).all())


@router.patch("/users/{user_id}")
async def patch_user(user_id: int, data: dict, db: AsyncSession = Depends(get_session)):
    user = await db.get(User, user_id)
    if not user: raise HTTPException(404, "User not found")
    if "role" in data:
        try: user.role = UserRole(data["role"])
        except ValueError: raise HTTPException(422, "Invalid role")
    if "payment" in data: user.payment = bool(data["payment"])
    await db.commit(); return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(User, user_id)
    if not item: raise HTTPException(404, "User not found")
    await db.delete(item); await db.commit()


@router.post("/courses", response_model=CourseOut, status_code=201)
async def create_course(data: CourseCreate, db: AsyncSession = Depends(get_session)):
    item = Course(**data.model_dump()); db.add(item); await db.commit(); await db.refresh(item); return item


@router.put("/courses/{course_id}", response_model=CourseOut)
async def put_course(course_id: int, data: CourseUpdate, db: AsyncSession = Depends(get_session)):
    item = await db.get(Course, course_id)
    if not item: raise HTTPException(404, "Course not found")
    for k,v in data.model_dump(exclude_unset=True).items(): setattr(item,k,v)
    await db.commit(); await db.refresh(item); return item


@router.delete("/courses/{course_id}", status_code=204)
async def delete_course(course_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(Course, course_id)
    if not item: raise HTTPException(404, "Course not found")
    await db.delete(item); await db.commit()


@router.post("/streams", response_model=StreamOut, status_code=201)
async def create_stream(data: StreamCreate, db: AsyncSession = Depends(get_session)):
    curator = await db.get(User, data.curator_id)
    if not curator or curator.role != UserRole.curator: raise HTTPException(422, "curator_id must reference a curator")
    item = Stream(**data.model_dump()); db.add(item); await db.commit(); await db.refresh(item); return item


@router.delete("/streams/{stream_id}", status_code=204)
async def delete_stream(stream_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(Stream, stream_id)
    if not item: raise HTTPException(404, "Stream not found")
    await db.delete(item); await db.commit()


@router.post("/lessons", status_code=201)
async def create_lesson(data: LessonCreate, db: AsyncSession = Depends(get_session)):
    item = Lesson(**data.model_dump()); db.add(item); await db.commit(); await db.refresh(item); return item


@router.post("/lessons/{lesson_id}/tasks", status_code=201)
async def create_task(lesson_id: int, data: TaskCreate, db: AsyncSession = Depends(get_session)):
    if not await db.get(Lesson, lesson_id): raise HTTPException(404, "Lesson not found")
    item = Task(lesson_id=lesson_id, **data.model_dump()); db.add(item); await db.commit(); await db.refresh(item); return item


@router.put("/lessons/{lesson_id}")
async def update_lesson(lesson_id: int, data: dict, db: AsyncSession = Depends(get_session)):
    item = await db.get(Lesson, lesson_id)
    if not item: raise HTTPException(404, "Lesson not found")
    for key in ("module_id", "type", "duration"):
        if key in data: setattr(item, key, data[key])
    await db.commit(); await db.refresh(item); return item


@router.delete("/lessons/{lesson_id}", status_code=204)
async def delete_lesson(lesson_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(Lesson, lesson_id)
    if not item: raise HTTPException(404, "Lesson not found")
    await db.delete(item); await db.commit()


@router.put("/tasks/{task_id}")
async def update_task(task_id: int, data: dict, db: AsyncSession = Depends(get_session)):
    item = await db.get(Task, task_id)
    if not item: raise HTTPException(404, "Task not found")
    for key in ("lesson_id", "type", "description", "answer_json"):
        if key in data: setattr(item, key, data[key])
    await db.commit(); await db.refresh(item); return item


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(Task, task_id)
    if not item: raise HTTPException(404, "Task not found")
    await db.delete(item); await db.commit()


@stats_router.get("/courses/{course_id}")
async def course_stats(course_id: int, user=Depends(require_role(UserRole.admin, UserRole.curator)), db: AsyncSession = Depends(get_session)):
    if not await db.get(Course, course_id): raise HTTPException(404, "Course not found")
    if user.role == UserRole.curator and not await db.scalar(select(Stream.id).where(Stream.course_id == course_id, Stream.curator_id == user.id)):
        raise HTTPException(403, "Course access denied")
    count = await db.scalar(select(func.count(func.distinct(StreamParticipant.user_id))).join(Stream).where(Stream.course_id == course_id, StreamParticipant.status == "accepted"))
    return {"students": count or 0, "average_rating": 0}


@stats_router.get("/streams/{stream_id}")
async def stream_stats(stream_id: int, user=Depends(require_role(UserRole.admin, UserRole.curator)), db: AsyncSession = Depends(get_session)):
    stream = await db.get(Stream, stream_id)
    if not stream: raise HTTPException(404, "Stream not found")
    if user.role == UserRole.curator and stream.curator_id != user.id: raise HTTPException(403, "Stream access denied")
    rows = await db.scalars(select(StreamRating.rating).join(StreamParticipant, StreamParticipant.user_id == StreamRating.user_id).where(StreamParticipant.stream_id == stream_id, StreamParticipant.status == "accepted"))
    ratings = list(rows.all()); return {"average_rating": sum(ratings) / len(ratings) if ratings else 0, "students": len(ratings)}
