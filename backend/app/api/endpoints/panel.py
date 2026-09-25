from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import require_role
from backend.app.db import get_session
from backend.app.models import (
    UserRole,
    User,
    Course,
    Stream,
    Module,
    Lesson,
    Task,
    StreamParticipant,
    Submission,
)
from backend.app.progress import stream_progress
from backend.app.schemas import (
    AdminUserUpdate,
    CourseCreate,
    CourseUpdate,
    CourseOut,
    StreamCreate,
    StreamOut,
    LessonCreate,
    LessonUpdate,
    TaskCreate,
    TaskUpdate,
    UserOut,
)

router = APIRouter(
    prefix="/panel",
    tags=["panel"],
    dependencies=[Depends(require_role(UserRole.admin))],
)
stats_router = APIRouter(
    prefix="/panel/stats",
    tags=["stats"],
    dependencies=[Depends(require_role(UserRole.admin, UserRole.curator))],
)


@router.get("/users", response_model=list[UserOut])
async def users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    role: UserRole | None = None,
    db: AsyncSession = Depends(get_session),
):
    q = select(User).limit(limit).offset(offset)
    if role:
        q = q.where(User.role == role)
    return list((await db.scalars(q)).all())


@router.patch("/users/{user_id}", response_model=UserOut)
async def patch_user(
    user_id: int, data: AdminUserUpdate, db: AsyncSession = Depends(get_session)
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    for key, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(User, user_id)
    if not item:
        raise HTTPException(404, "User not found")
    await db.delete(item)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "User is a curator of existing streams; reassign or delete them first")


@router.post("/courses", response_model=CourseOut, status_code=201)
async def create_course(data: CourseCreate, db: AsyncSession = Depends(get_session)):
    item = Course(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/courses/{course_id}", response_model=CourseOut)
async def put_course(
    course_id: int, data: CourseUpdate, db: AsyncSession = Depends(get_session)
):
    item = await db.get(Course, course_id)
    if not item:
        raise HTTPException(404, "Course not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/courses/{course_id}", status_code=204)
async def delete_course(course_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(Course, course_id)
    if not item:
        raise HTTPException(404, "Course not found")
    await db.delete(item)
    await db.commit()


@router.post("/streams", response_model=StreamOut, status_code=201)
async def create_stream(data: StreamCreate, db: AsyncSession = Depends(get_session)):
    if not await db.get(Course, data.course_id):
        raise HTTPException(404, "Course not found")
    curator = await db.get(User, data.curator_id)
    if not curator or curator.role != UserRole.curator:
        raise HTTPException(422, "curator_id must reference a curator")
    item = Stream(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/streams/{stream_id}", status_code=204)
async def delete_stream(stream_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(Stream, stream_id)
    if not item:
        raise HTTPException(404, "Stream not found")
    await db.delete(item)
    await db.commit()


@router.post("/lessons", status_code=201)
async def create_lesson(data: LessonCreate, db: AsyncSession = Depends(get_session)):
    if not await db.get(Module, data.module_id):
        raise HTTPException(404, "Module not found")
    item = Lesson(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/lessons/{lesson_id}/tasks", status_code=201)
async def create_task(
    lesson_id: int, data: TaskCreate, db: AsyncSession = Depends(get_session)
):
    if not await db.get(Lesson, lesson_id):
        raise HTTPException(404, "Lesson not found")
    item = Task(lesson_id=lesson_id, **data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/lessons/{lesson_id}")
async def update_lesson(
    lesson_id: int, data: LessonUpdate, db: AsyncSession = Depends(get_session)
):
    item = await db.get(Lesson, lesson_id)
    if not item:
        raise HTTPException(404, "Lesson not found")
    values = data.model_dump(exclude_unset=True, exclude_none=True)
    if "module_id" in values and not await db.get(Module, values["module_id"]):
        raise HTTPException(404, "Module not found")
    for key, value in values.items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/lessons/{lesson_id}", status_code=204)
async def delete_lesson(lesson_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(Lesson, lesson_id)
    if not item:
        raise HTTPException(404, "Lesson not found")
    await db.delete(item)
    await db.commit()


@router.put("/tasks/{task_id}")
async def update_task(
    task_id: int, data: TaskUpdate, db: AsyncSession = Depends(get_session)
):
    item = await db.get(Task, task_id)
    if not item:
        raise HTTPException(404, "Task not found")
    values = data.model_dump(exclude_unset=True)
    if values.get("lesson_id") is not None and not await db.get(Lesson, values["lesson_id"]):
        raise HTTPException(404, "Lesson not found")
    for key, value in values.items():
        if value is not None or key == "answer_json":
            setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_session)):
    item = await db.get(Task, task_id)
    if not item:
        raise HTTPException(404, "Task not found")
    await db.delete(item)
    await db.commit()


@stats_router.get("/courses/{course_id}")
async def course_stats(
    course_id: int,
    user=Depends(require_role(UserRole.admin, UserRole.curator)),
    db: AsyncSession = Depends(get_session),
):
    if not await db.get(Course, course_id):
        raise HTTPException(404, "Course not found")
    if user.role == UserRole.curator and not await db.scalar(
        select(Stream.id).where(
            Stream.course_id == course_id, Stream.curator_id == user.id
        )
    ):
        raise HTTPException(403, "Course access denied")
    streams = (await db.scalars(select(Stream).where(Stream.course_id == course_id))).all()
    rows = [row for stream in streams for row in await stream_progress(db, stream)]
    return {
        "students": len({row["user_id"] for row in rows}),
        "average_percent": round(sum(row["percent"] for row in rows) / len(rows)) if rows else 0,
        "at_risk": sum(1 for row in rows if row["risk_reasons"]),
    }


@stats_router.get("/streams/{stream_id}")
async def stream_stats(
    stream_id: int,
    user=Depends(require_role(UserRole.admin, UserRole.curator)),
    db: AsyncSession = Depends(get_session),
):
    stream = await db.get(Stream, stream_id)
    if not stream:
        raise HTTPException(404, "Stream not found")
    if user.role == UserRole.curator and stream.curator_id != user.id:
        raise HTTPException(403, "Stream access denied")
    rows = await stream_progress(db, stream)
    return {
        "students": len(rows),
        "average_percent": round(sum(row["percent"] for row in rows) / len(rows)) if rows else 0,
        "expected_percent": rows[0]["expected_percent"] if rows else 0,
        "at_risk": sum(1 for row in rows if row["risk_reasons"]),
    }


@stats_router.get("/curator-alerts")
async def curator_alerts(
    user=Depends(require_role(UserRole.admin, UserRole.curator)),
    db: AsyncSession = Depends(get_session),
):
    from backend.app.models import course_modules

    sub_stmt = (
        select(Submission, Task, User)
        .join(Task, Task.id == Submission.task_id)
        .join(User, User.id == Submission.user_id)
        .where(Submission.grade == -1)
        .order_by(Submission.id.desc())
    )
    students_stmt = (
        select(func.count(func.distinct(StreamParticipant.user_id)))
        .join(Stream, Stream.id == StreamParticipant.stream_id)
        .where(StreamParticipant.status == "accepted")
    )
    if user.role == UserRole.curator:
        # A curator only sees work of students enrolled in their own streams, for tasks of those streams' courses.
        own_pairs = (
            select(StreamParticipant.user_id, Lesson.id.label("lesson_id"))
            .join(Stream, Stream.id == StreamParticipant.stream_id)
            .join(course_modules, course_modules.c.course_id == Stream.course_id)
            .join(Lesson, Lesson.module_id == course_modules.c.module_id)
            .where(Stream.curator_id == user.id)
            .subquery()
        )
        sub_stmt = sub_stmt.where(
            select(own_pairs.c.user_id)
            .where(own_pairs.c.user_id == Submission.user_id, own_pairs.c.lesson_id == Task.lesson_id)
            .exists()
        )
        students_stmt = students_stmt.where(Stream.curator_id == user.id)
    sub_rows = (await db.execute(sub_stmt)).all()
    pending_items = [
        {
            "submission_id": sub.id,
            "task_id": sub.task_id,
            "task_title": tsk.title or f"Шаг {tsk.step_number}",
            "task_type": str(tsk.type.value if hasattr(tsk.type, "value") else tsk.type),
            "student_id": u.id,
            "student_name": f"{u.first_name} {u.last_name}".strip() or u.username,
            "input": sub.input,
            "file_id": sub.file_id,
        }
        for sub, tsk, u in sub_rows
    ]

    active_students_count = await db.scalar(students_stmt) or 0

    return {
        "pending_count": len(pending_items),
        "pending_submissions": pending_items,
        "active_students": active_students_count,
    }
