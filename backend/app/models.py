from datetime import datetime
from enum import Enum
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    Column,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import JSON


class Base(DeclarativeBase):
    pass


class UserRole(str, Enum):
    admin = "admin"
    curator = "curator"
    student = "student"


class StepType(str, Enum):
    minecraft_edu = "minecraft_edu"
    scratch = "scratch"
    algorithm = "algorithm"
    custom = "custom"


# A reusable module can be included in more than one course.
course_modules = Table(
    "course_modules",
    Base.metadata,
    Column("course_id", ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True),
    Column("module_id", ForeignKey("modules.id", ondelete="CASCADE"), primary_key=True),
    Column("position", Integer, nullable=False, default=0),
)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_roles"), default=UserRole.student, index=True
    )
    confirmed_docs: Mapped[list] = mapped_column(JSON, default=list)
    payment: Mapped[bool] = mapped_column(Boolean, default=False)


class Course(Base):
    __tablename__ = "courses"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String(50), default="general")
    modules: Mapped[list["Module"]] = relationship(
        secondary=course_modules, back_populates="courses"
    )


class Module(Base):
    __tablename__ = "modules"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    courses: Mapped[list[Course]] = relationship(
        secondary=course_modules, back_populates="modules"
    )
    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="module", cascade="all, delete-orphan"
    )


class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[int] = mapped_column(primary_key=True)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("modules.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(50), default="lesson")
    duration: Mapped[int] = mapped_column(Integer, default=0)
    module: Mapped[Module] = relationship(back_populates="lessons")
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan"
    )


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[StepType] = mapped_column(SAEnum(StepType, name="step_types"))
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    answer_json: Mapped[dict | list | None] = mapped_column(JSON)
    lesson: Mapped[Lesson] = relationship(back_populates="tasks")


class Stream(Base):
    __tablename__ = "streams"
    __table_args__ = (CheckConstraint("start_date < end_date", name="ck_stream_dates"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    curator_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class StreamParticipant(Base):
    __tablename__ = "stream_participants"
    __table_args__ = (
        UniqueConstraint("user_id", "stream_id"),
        CheckConstraint("status IN ('pending','accepted','rejected')"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    stream_id: Mapped[int] = mapped_column(
        ForeignKey("streams.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(12), default="pending")
    user_stream_rating: Mapped[float] = mapped_column(Float, default=0)


class StreamRating(Base):
    __tablename__ = "stream_ratings"
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    rating: Mapped[float] = mapped_column(Float, default=0)


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("task_id", "user_id"),
        CheckConstraint("grade >= -1 AND grade <= 100", name="ck_submission_grade"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    file_id: Mapped[str | None] = mapped_column(Text)
    input: Mapped[str | None] = mapped_column(Text)
    feedback_message: Mapped[str | None] = mapped_column(Text)
    grade: Mapped[int] = mapped_column(Integer, default=-1)


class Broadcast(Base):
    __tablename__ = "broadcasts"
    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    curator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)


class StreamBroadcast(Base):
    __tablename__ = "stream_broadcasts"
    id: Mapped[int] = mapped_column(primary_key=True)
    stream_id: Mapped[int] = mapped_column(
        ForeignKey("streams.id", ondelete="CASCADE"), index=True
    )
    broadcast_id: Mapped[int] = mapped_column(
        ForeignKey("broadcasts.id", ondelete="CASCADE"), unique=True
    )
