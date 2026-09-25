from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/learning"
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

    # Outgoing mail (SMTP). Defaults target Yandex Mail: SSL on port 465.
    mail_server: str = "smtp.yandex.ru"
    mail_port: int = 465
    mail_username: str | None = None
    mail_password: str | None = None  # Yandex: an app password, not the account password
    mail_from: str | None = None  # Yandex requires it to match mail_username
    mail_from_name: str = "PixelStart"
    mail_starttls: bool = False
    mail_ssl_tls: bool = True
    verification_token_expire: int = 1440  # 24 hours in minutes
    password_reset_token_expire: int = 60  # minutes
    email_change_token_expire: int = 1440  # minutes
    frontend_url: str = "http://127.0.0.1:8000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
