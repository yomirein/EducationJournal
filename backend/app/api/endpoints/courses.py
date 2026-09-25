from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool
from backend.app.api.deps import get_current_user
from backend.app.core.config import settings
from backend.app.db import get_session
from backend.app.models import (
    Course,
    Module,
    Lesson,
    Task,
    Submission,
    Stream,
    StreamParticipant,
    UserRole,
    course_modules,
)
from backend.app.repositories import CourseRepository
from backend.app.schemas import CourseOut, RunTestsRequest, SubmitCreate

router = APIRouter(prefix="/courses", tags=["courses"])


async def has_course_access(course_id: int, user, db: AsyncSession) -> bool:
    if user.payment:
        return True
    return bool(
        await db.scalar(
            select(StreamParticipant.id)
            .join(Stream)
            .where(
                Stream.course_id == course_id,
                StreamParticipant.user_id == user.id,
                StreamParticipant.status == "accepted",
            )
        )
    )


@router.get("", response_model=list[CourseOut])
async def courses(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
):
    return await CourseRepository(db).page(limit, offset)


@router.get("/{course_id}", response_model=CourseOut)
async def course(course_id: int, db: AsyncSession = Depends(get_session)):
    item = await CourseRepository(db).get(course_id)
    if not item:
        raise HTTPException(404, "Course not found")
    return item


@router.get("/{course_id}/modules")
async def course_modules_list(
    course_id: int,
    db: AsyncSession = Depends(get_session),
):
    course_item = await db.get(Course, course_id)
    if not course_item:
        raise HTTPException(404, "Course not found")
    stmt = (
        select(Module)
        .join(course_modules, course_modules.c.module_id == Module.id)
        .where(course_modules.c.course_id == course_id)
        .order_by(course_modules.c.position)
    )
    modules = list((await db.scalars(stmt)).all())
    result = []
    for mod in modules:
        lessons_stmt = (
            select(Lesson)
            .where(Lesson.module_id == mod.id)
            .order_by(Lesson.id)
        )
        lessons = list((await db.scalars(lessons_stmt)).all())
        lessons_data = []
        for les in lessons:
            tasks_stmt = select(Task).where(Task.lesson_id == les.id).order_by(Task.id)
            tasks = list((await db.scalars(tasks_stmt)).all())
            lessons_data.append({
                "id": les.id,
                "type": les.type,
                "duration": les.duration,
                "tasks": [{"id": t.id, "type": t.type, "description": t.description} for t in tasks]
            })
        result.append({
            "id": mod.id,
            "name": mod.name,
            "description": mod.description,
            "lessons": lessons_data
        })
    return result


from backend.app.evaluator import evaluate_submission


def sanitize_task_meta(meta: dict | None, role: UserRole) -> dict:
    if not meta or not isinstance(meta, dict):
        return {}
    if role in (UserRole.admin, UserRole.curator):
        return meta
    # Secure student payload: omit answers and hidden test cases
    safe = dict(meta)
    safe.pop("correct_answers", None)
    safe.pop("number_answer", None)
    safe.pop("hidden_tests", None)
    safe.pop("reference_solution", None)
    safe.pop("criteria", None)
    safe.pop("hint", None)
    return safe


@router.get("/{course_id}/tasks")
async def course_tasks(
    course_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    item = await db.get(Course, course_id)
    if not item:
        raise HTTPException(404, "Course not found")
    if user.role == UserRole.student and not await has_course_access(
        course_id, user, db
    ):
        raise HTTPException(403, "Course access requires payment or enrollment")
    stmt = (
        select(Task, Lesson, Module)
        .join(Lesson, Lesson.id == Task.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .join(course_modules, (course_modules.c.module_id == Module.id) & (course_modules.c.course_id == course_id))
        .order_by(course_modules.c.position, Lesson.id, Task.order_index, Task.id)
    )
    rows = await db.execute(stmt)
    return [
        {
            "id": tsk.id,
            "lesson_id": tsk.lesson_id,
            "module_id": mod.id,
            "title": tsk.title or f"Шаг {tsk.step_number or tsk.id}",
            "step_number": tsk.step_number,
            "type": str(tsk.type.value if hasattr(tsk.type, "value") else tsk.type),
            "check_type": tsk.check_type,
            "submit_type": tsk.submit_type,
            "order_index": tsk.order_index,
            "description": tsk.description,
            "answer_json": sanitize_task_meta(tsk.answer_json, user.role),
            "module_name": mod.name,
            "course_id": course_id,
            "course_type": item.type,
            "course_title": item.title,
            "course_grades": item.grades,
            "course_volume": item.volume,
            "course_tool": item.tool,
            "course_goal": item.goal,
        }
        for tsk, les, mod in rows.all()
    ]


@router.post("/{course_id}/tasks/{task_id}/submissions", status_code=201)
async def submit(
    course_id: int,
    task_id: int,
    data: SubmitCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    task = await db.scalar(
        select(Task)
        .join(Lesson)
        .join(Module)
        .where(Task.id == task_id, Module.courses.any(id=course_id))
    )
    if not task:
        raise HTTPException(404, "Task not found")
    if user.role == UserRole.student and not await has_course_access(
        course_id, user, db
    ):
        raise HTTPException(403, "Course access requires payment or enrollment")
    if data.file_id and not (Path(settings.upload_dir) / data.file_id).is_file():
        raise HTTPException(422, "Uploaded file not found")

    item = await db.scalar(
        select(Submission).where(
            Submission.task_id == task_id, Submission.user_id == user.id
        )
    )
    if item is None:
        item = Submission(task_id=task_id, user_id=user.id)
        db.add(item)

    eval_result = await run_in_threadpool(
        evaluate_submission, task.type, task.answer_json, data.input, data.file_id
    )

    item.input = data.input
    item.file_id = data.file_id
    item.grade = eval_result["grade"]
    item.feedback_message = eval_result["feedback_message"]

    await db.commit()
    await db.refresh(item)
    return {
        "id": item.id,
        "task_id": item.task_id,
        "user_id": item.user_id,
        "input": item.input,
        "file_id": item.file_id,
        "grade": item.grade,
        "feedback_message": item.feedback_message,
        "status": eval_result.get("status", "completed"),
        "test_details": eval_result.get("test_details", []),
    }


@router.post("/{course_id}/tasks/{task_id}/run-tests")
async def run_task_tests(
    course_id: int,
    task_id: int,
    data: RunTestsRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    task = await db.scalar(
        select(Task)
        .join(Lesson)
        .join(Module)
        .where(Task.id == task_id, Module.courses.any(id=course_id))
    )
    if not task:
        raise HTTPException(404, "Task not found")
    if task.type != "code_test":
        raise HTTPException(400, "Only Python tasks support sample runs")
    if user.role == UserRole.student and not await has_course_access(course_id, user, db):
        raise HTTPException(403, "Course access requires payment or enrollment")
    sample_only = {**(task.answer_json or {}), "hidden_tests": []}
    eval_result = await run_in_threadpool(evaluate_submission, task.type, sample_only, data.input, None)
    return {
        "task_id": task.id,
        "grade": eval_result["grade"],
        "feedback_message": eval_result["feedback_message"],
        "status": eval_result.get("status", "completed"),
        "test_details": eval_result.get("test_details", []),
    }


@router.get("/{course_id}/tasks/{task_id}/grade")
async def grade(
    course_id: int,
    task_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    task = await db.scalar(
        select(Task)
        .join(Lesson, Lesson.id == Task.lesson_id)
        .join(course_modules, course_modules.c.module_id == Lesson.module_id)
        .where(Task.id == task_id, course_modules.c.course_id == course_id)
    )
    if not task:
        raise HTTPException(404, "Task not found in course")
    if user.role == UserRole.student and not await has_course_access(course_id, user, db):
        raise HTTPException(403, "Course access requires payment or enrollment")
    item = await db.scalar(
        select(Submission).where(
            Submission.task_id == task_id, Submission.user_id == user.id
        ).order_by(Submission.grade.desc(), Submission.id.desc())
    )
    if not item:
        raise HTTPException(404, "Submission not found")
    passed = item.grade >= 50 and (task.type != "code_test" or item.grade == 100)
    status = "completed" if passed else ("pending_review" if item.grade == -1 else "failed")
    return {
        "grade": item.grade,
        "feedback_message": item.feedback_message,
        "status": status
    }
