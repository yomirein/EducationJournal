from pydantic_settings import BaseSettings
import os

from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    SECRET_KEY: str = '123456'


    class Config:
        env_file = ".env"

settings = Settings(
    
)

