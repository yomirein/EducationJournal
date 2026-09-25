"""Progress and rating: the single place that decides when a step is passed and how points add up.

Rules (shown to students as RATING_RULES):
- a step is passed at grade >= 50; a task with tests needs all tests passed (100);
- a passed step gives points equal to its grade, whether the grade came from
  auto-checking or from the curator;
- course rating = sum of points for the course's passed steps; place = rank among
  the accepted participants of the same stream.

Curators get early warnings (see stream_progress): a student is flagged when they
are BEHIND_THRESHOLD percentage points behind the stream's timeline, or have not
sent any work for INACTIVE_DAYS days.
"""
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models import (
    Lesson,
    Stream,
    StreamParticipant,
    Submission,
    Task,
    User,
    course_modules,
)

PASS_GRADE = 50
MANUAL_TYPES = {"project", "minecraft_edu"}
BEHIND_THRESHOLD = 20
INACTIVE_DAYS = 7

RATING_RULES = [
    "За каждый зачтённый шаг начисляются баллы, равные оценке — от 50 до 100.",
    "Шаг зачтён при оценке от 50. Задача с тестами — только когда пройдены все тесты (100 баллов).",
    "Оценка куратора за проект засчитывается так же, как автоматическая проверка.",
    "Работа на проверке баллов пока не даёт: они появятся после оценки куратора.",
    "Рейтинг курса — сумма баллов за его шаги. Место считается среди учеников вашего потока.",
]


def is_passed(task_type: str, grade: int) -> bool:
    return grade >= PASS_GRADE and (task_type != "code_test" or grade == 100)


def step_status(task_type: str, grade: int | None) -> str:
    if grade is None:
        return "not_started"
    if grade == -1:
        return "pending"
    return "passed" if is_passed(task_type, grade) else "failed"


def check_kind(task: Task) -> str:
    """'curator' when a person grades the step, 'auto' when the platform does."""
    meta = task.answer_json if isinstance(task.answer_json, dict) else {}
    if task.type in MANUAL_TYPES:
        return "curator"
    if task.type == "scratch" and meta.get("number_answer") is None and not meta.get("correct_answers"):
        return "curator"
    return "auto"


async def course_tasks(db: AsyncSession, course_id: int) -> list[Task]:
    """Steps of a course in study order (same order as GET /courses/{id}/tasks)."""
    rows = await db.scalars(
        select(Task)
        .join(Lesson, Lesson.id == Task.lesson_id)
        .join(course_modules, course_modules.c.module_id == Lesson.module_id)
        .where(course_modules.c.course_id == course_id)
        .order_by(course_modules.c.position, Lesson.id, Task.order_index, Task.id)
    )
    return list(rows.all())


async def submissions_by_user(
    db: AsyncSession, user_ids: list[int], task_ids: list[int]
) -> dict[int, dict[int, Submission]]:
    if not user_ids or not task_ids:
        return {}
    rows = await db.scalars(
        select(Submission).where(Submission.user_id.in_(user_ids), Submission.task_id.in_(task_ids))
    )
    result: dict[int, dict[int, Submission]] = {}
    for sub in rows.all():
        result.setdefault(sub.user_id, {})[sub.task_id] = sub
    return result


def summarize(tasks: list[Task], submissions: dict[int, Submission]) -> dict:
    """Per-step breakdown and totals for one student in one course."""
    steps = []
    for task in tasks:
        sub = submissions.get(task.id)
        grade = sub.grade if sub else None
        status = step_status(task.type, grade)
        steps.append({
            "task_id": task.id,
            "step_number": task.step_number,
            "title": task.title or f"Шаг {task.step_number or task.id}",
            "type": task.type,
            "check": check_kind(task),
            "status": status,
            "grade": grade,
            "points": grade if status == "passed" else 0,
        })
    passed = sum(1 for step in steps if step["status"] == "passed")
    # Next step: first one that is neither passed nor waiting for the curator.
    next_step = next((step for step in steps if step["status"] in ("not_started", "failed")), None)
    return {
        "steps": steps,
        "passed": passed,
        "total": len(steps),
        "percent": round(100 * passed / len(steps)) if steps else 0,
        "points": sum(step["points"] for step in steps),
        "max_points": 100 * len(steps),
        "pending": sum(1 for step in steps if step["status"] == "pending"),
        "next_step": next_step,
    }


def expected_percent(stream: Stream, now: datetime) -> int:
    """Share of the stream's time already elapsed: where a student should be by now."""
    total = (stream.end_date - stream.start_date).total_seconds()
    elapsed = (now - stream.start_date).total_seconds()
    if total <= 0:
        return 100
    return round(100 * min(max(elapsed / total, 0), 1))


def risk_reasons(summary: dict, expected: int, last_activity: datetime | None,
                 stream: Stream, now: datetime) -> list[str]:
    if summary["total"] and summary["passed"] == summary["total"]:
        return []
    reasons = []
    lag = expected - summary["percent"]
    if lag >= BEHIND_THRESHOLD:
        reasons.append(f"Отстаёт от графика потока на {lag}%")
    if last_activity:
        idle_days = (now - last_activity).days
        if idle_days >= INACTIVE_DAYS:
            reasons.append(f"Не сдавал работы {idle_days} дн.")
    elif (now - stream.start_date).days >= INACTIVE_DAYS:
        reasons.append("Ещё не сдал ни одной работы")
    return reasons


async def stream_progress(db: AsyncSession, stream: Stream, with_steps: bool = False) -> list[dict]:
    """Progress of every accepted participant of a stream, ranked by points."""
    now = datetime.now(timezone.utc)
    tasks = await course_tasks(db, stream.course_id)
    students = list((await db.scalars(
        select(User)
        .join(StreamParticipant, StreamParticipant.user_id == User.id)
        .where(StreamParticipant.stream_id == stream.id, StreamParticipant.status == "accepted")
    )).all())
    subs = await submissions_by_user(db, [u.id for u in students], [t.id for t in tasks])
    expected = expected_percent(stream, now)

    rows = []
    for student in students:
        own = subs.get(student.id, {})
        summary = summarize(tasks, own)
        times = [sub.submitted_at for sub in own.values() if sub.submitted_at]
        last_activity = max(times) if times else None
        row = {
            "user_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}".strip() or student.username,
            "username": student.username,
            "points": summary["points"],
            "max_points": summary["max_points"],
            "passed": summary["passed"],
            "total": summary["total"],
            "pending": summary["pending"],
            "percent": summary["percent"],
            "expected_percent": expected,
            "last_activity": last_activity.isoformat() if last_activity else None,
            "next_step": summary["next_step"],
            "risk_reasons": risk_reasons(summary, expected, last_activity, stream, now),
        }
        if with_steps:
            row["steps"] = summary["steps"]
        rows.append(row)

    rows.sort(key=lambda row: (row["points"], row["passed"]), reverse=True)
    for place, row in enumerate(rows, 1):
        row["rank"] = place
    return rows
