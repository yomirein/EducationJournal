from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./learning.db"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire: int = 30
    refresh_token_expire: int = 10080
    upload_dir: str = "uploads"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
