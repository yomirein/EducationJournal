from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from backend.app.models import StepType, UserRole


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)


class UserOut(ORM):
    id: int
    first_name: str
    last_name: str
    username: str
    email: EmailStr
    description: str | None
    role: UserRole
    confirmed_docs: list
    payment: bool
    is_verified: bool


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None
    description: str | None = None
    password: str | None = Field(None, min_length=8)


class Login(BaseModel):
    login: str
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class CourseCreate(BaseModel):
    title: str
    description: str = ""
    type: str = "general"
    grades: str | None = None
    volume: str | None = None
    tool: str | None = None
    goal: str | None = None


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    type: str | None = None
    grades: str | None = None
    volume: str | None = None
    tool: str | None = None
    goal: str | None = None


class CourseOut(ORM):
    id: int
    title: str
    description: str
    type: str
    grades: str | None = None
    volume: str | None = None
    tool: str | None = None
    goal: str | None = None


class StreamCreate(BaseModel):
    course_id: int
    curator_id: int
    name: str
    start_date: datetime
    end_date: datetime

    @model_validator(mode="after")
    def dates_ordered(self):
        if self.start_date >= self.end_date:
            raise ValueError("start_date must precede end_date")
        return self


class StreamOut(ORM):
    id: int
    course_id: int
    curator_id: int
    name: str
    start_date: datetime
    end_date: datetime


class LessonCreate(BaseModel):
    module_id: int
    type: str = "lesson"
    duration: int = Field(default=0, ge=0)


class TaskCreate(BaseModel):
    type: str = "theory"
    title: str | None = None
    step_number: str | None = None
    check_type: str | None = None
    submit_type: str | None = None
    order_index: int = 0
    description: str
    answer_json: dict | list | None = None


class TaskOut(ORM):
    id: int
    lesson_id: int
    title: str | None = None
    step_number: str | None = None
    type: str
    check_type: str | None = None
    submit_type: str | None = None
    order_index: int = 0
    description: str
    answer_json: dict | list | None = None


class SubmitCreate(BaseModel):
    input: str | None = None
    file_id: str | None = None


class GradeUpdate(BaseModel):
    grade: int = Field(ge=-1, le=100)
    feedback_message: str | None = None
