from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
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


class ForgotPasswordRequest(BaseModel):
    login: str = Field(min_length=1, max_length=320)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


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
    input: str | None = Field(None, max_length=12_000)
    file_id: str | None = Field(None, pattern=r"^[0-9a-f]{32}\.(png|jpg|jpeg|webp|pdf|txt)$")


class RunTestsRequest(BaseModel):
    input: str = Field(max_length=12_000)


class BroadcastCreate(BaseModel):
    text: str = Field(max_length=10_000)

    @field_validator("text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text is required")
        return value


class AdminUserUpdate(BaseModel):
    role: UserRole | None = None
    payment: bool | None = None
    is_verified: bool | None = None


class LessonUpdate(BaseModel):
    module_id: int | None = None
    type: str | None = Field(None, max_length=50)
    duration: int | None = Field(None, ge=0)


class TaskUpdate(BaseModel):
    lesson_id: int | None = None
    type: str | None = Field(None, max_length=50)
    description: str | None = None
    answer_json: dict | list | None = None


class GradeUpdate(BaseModel):
    grade: int = Field(ge=-1, le=100)
    feedback_message: str | None = None
