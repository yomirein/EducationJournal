import logging
from urllib.parse import quote
import certifi
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from fastapi_mail.errors import ConnectionErrors
from backend.app.core.config import settings

logger = logging.getLogger("pixelstart.email")


def get_email_config() -> ConnectionConfig | None:
    """SMTP settings, or None when outgoing mail is not configured.

    Mail is sent when MAIL_FROM or MAIL_USERNAME is set. Credentials are used only
    when both MAIL_USERNAME and MAIL_PASSWORD are present, so a local catcher such as
    Mailpit (no auth) works with just MAIL_SERVER, MAIL_PORT and MAIL_FROM.
    """
    sender = settings.mail_from or settings.mail_username
    if not sender:
        return None
    use_credentials = bool(settings.mail_username and settings.mail_password)
    return ConnectionConfig(
        MAIL_USERNAME=settings.mail_username or "",
        MAIL_PASSWORD=settings.mail_password or "",
        MAIL_FROM=sender,
        MAIL_FROM_NAME=settings.mail_from_name,
        MAIL_PORT=settings.mail_port,
        MAIL_SERVER=settings.mail_server,
        MAIL_STARTTLS=settings.mail_starttls,
        MAIL_SSL_TLS=settings.mail_ssl_tls,
        USE_CREDENTIALS=use_credentials,
        VALIDATE_CERTS=use_credentials,
        # Some Python builds (e.g. python.org on macOS) ship without a CA store.
        CERT_BUNDLE=certifi.where() if use_credentials else None,
    )


async def send_email(recipient: str, subject: str, html_body: str) -> bool:
    """Sends one HTML email. Returns False instead of raising, because it runs as a background task."""
    try:
        config = get_email_config()
    except ValueError as exc:  # pydantic rejects e.g. an invalid MAIL_FROM
        logger.error("Invalid mail settings in .env: %s", exc)
        return False
    if not config:
        logger.warning("Skipping email to %s: mail settings not configured", recipient)
        return False
    message = MessageSchema(
        subject=subject,
        recipients=[recipient],
        body=html_body,
        subtype=MessageType.html,
    )
    try:
        await FastMail(config).send_message(message)
    except ConnectionErrors as exc:
        logger.error(
            "Failed to send email to %s via %s:%s: %s",
            recipient, settings.mail_server, settings.mail_port, exc,
        )
        return False
    logger.info("Email '%s' sent to %s", subject, recipient)
    return True


async def send_verification_email(email: str, token: str) -> bool:
    verification_url = f"{settings.frontend_url.rstrip('/')}/auth/verify.html?token={quote(token)}"
    hours = settings.verification_token_expire // 60
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50;">Подтверждение email</h2>
                <p>Здравствуйте!</p>
                <p>Для завершения регистрации на платформе PixelStart подтвердите ваш email-адрес, нажав на кнопку ниже:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}"
                       style="background-color: #4CAF50; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Подтвердить email
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br>
                    <a href="{verification_url}" style="color: #4CAF50;">{verification_url}</a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    Ссылка действительна в течение {hours} ч.
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Если вы не регистрировались на нашей платформе, проигнорируйте это письмо.
                </p>
            </div>
        </body>
    </html>
    """
    return await send_email(email, "Подтверждение email — PixelStart", html_body)


async def send_password_reset_email(email: str, token: str) -> bool:
    reset_url = f"{settings.frontend_url.rstrip('/')}/auth/reset.html?token={quote(token)}"
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #3457f0;">Восстановление пароля</h2>
                <p>Здравствуйте!</p>
                <p>Кто-то запросил смену пароля для вашего аккаунта на платформе PixelStart. Чтобы задать новый пароль, нажмите на кнопку:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}"
                       style="background-color: #3457f0; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Задать новый пароль
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Если кнопка не работает, скопируйте ссылку в браузер:<br>
                    <a href="{reset_url}" style="color: #3457f0;">{reset_url}</a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    Ссылка действует {settings.password_reset_token_expire} минут и сработает один раз.
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Если вы не запрашивали смену пароля, просто проигнорируйте письмо — пароль останется прежним.
                </p>
            </div>
        </body>
    </html>
    """
    return await send_email(email, "Восстановление пароля — PixelStart", html_body)


async def send_email_change_email(email: str, token: str) -> bool:
    confirm_url = f"{settings.frontend_url.rstrip('/')}/auth/verify.html?change=1&token={quote(token)}"
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #3457f0;">Подтверждение новой почты</h2>
                <p>Здравствуйте!</p>
                <p>Этот адрес указали как новую почту аккаунта на платформе PixelStart. Подтвердите смену:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{confirm_url}"
                       style="background-color: #3457f0; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Подтвердить новую почту
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Если кнопка не работает, скопируйте ссылку в браузер:<br>
                    <a href="{confirm_url}" style="color: #3457f0;">{confirm_url}</a>
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Пока вы не подтвердите смену, вход и письма идут на прежний адрес. Если вы ничего не меняли, проигнорируйте письмо.
                </p>
            </div>
        </body>
    </html>
    """
    return await send_email(email, "Подтверждение новой почты — PixelStart", html_body)
