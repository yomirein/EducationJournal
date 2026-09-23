from pydantic import BaseModel

class UserCreate(BaseModel):
    role: str
    name:str
    password: str

class UserOut(BaseModel):
    id: int
    role: str
    name: str

    class Config:
        from_attributes = True