from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./learning.db"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire: int = 30
    refresh_token_expire: int = 10080
    upload_dir: str = "uploads"
    first_admin_username: str | None = None
    first_admin_email: str | None = None
    first_admin_password: str | None = None
    first_admin_first_name: str = "Admin"
    first_admin_last_name: str = "Admin"

    # Email verification settings
    mail_server: str = "smtp.gmail.com"
    mail_port: int = 587
    mail_username: str | None = None
    mail_password: str | None = None
    mail_from: str | None = None
    mail_starttls: bool = True
    mail_ssl_tls: bool = False
    verification_token_expire: int = 1440  # 24 hours in minutes
    frontend_url: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
