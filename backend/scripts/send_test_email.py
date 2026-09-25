"""Sends a test email with the current SMTP settings from .env.

Usage (from the repository root):
    python -m backend.scripts.send_test_email you@example.com
"""
import asyncio
import sys

from backend.app.core.config import settings
from backend.app.core.email import get_email_config, send_email


async def main(recipient: str) -> int:
    try:
        config = get_email_config()
    except ValueError as exc:
        print(f"Ошибка в настройках почты в .env: {exc}")
        return 1
    if not config:
        print("Почта не настроена: задайте в .env MAIL_FROM или MAIL_USERNAME (см. README, раздел про email).")
        return 1
    print(
        f"SMTP: {settings.mail_server}:{settings.mail_port} "
        f"(SSL={settings.mail_ssl_tls}, STARTTLS={settings.mail_starttls}, "
        f"авторизация={'да' if config.USE_CREDENTIALS else 'нет'}), отправитель: {config.MAIL_FROM}"
    )
    sent = await send_email(
        recipient,
        "Тестовое письмо — PixelStart",
        "<p>Если вы видите это письмо, отправка почты с платформы PixelStart настроена правильно.</p>",
    )
    print("Письмо отправлено." if sent else "Не удалось отправить письмо, причина выше в логе.")
    return 0 if sent else 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Использование: python -m backend.scripts.send_test_email you@example.com")
    sys.exit(asyncio.run(main(sys.argv[1])))
