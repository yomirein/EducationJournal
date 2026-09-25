"""Checks which SMTP mode get_email_config() picks from the settings."""

import unittest
from unittest.mock import patch

from backend.app.core.config import settings
from backend.app.core.email import get_email_config


class EmailConfigChecks(unittest.TestCase):
    def configure(self, **values):
        base = {"mail_username": None, "mail_password": None, "mail_from": None}
        patcher = patch.multiple(settings, **{**base, **values})
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_disabled_without_sender(self):
        self.configure()
        self.assertIsNone(get_email_config())

    def test_local_catcher_without_credentials(self):
        self.configure(mail_server="localhost", mail_port=1025, mail_from="noreply@pixelstart.dev",
                       mail_ssl_tls=False, mail_starttls=False)
        config = get_email_config()
        self.assertFalse(config.USE_CREDENTIALS)
        self.assertEqual("noreply@pixelstart.dev", config.MAIL_FROM)

    def test_yandex_uses_credentials_and_login_as_sender(self):
        self.configure(mail_server="smtp.yandex.ru", mail_port=465, mail_ssl_tls=True, mail_starttls=False,
                       mail_username="school@yandex.ru", mail_password="app-password")
        config = get_email_config()
        self.assertTrue(config.USE_CREDENTIALS)
        self.assertTrue(config.VALIDATE_CERTS)
        self.assertEqual("school@yandex.ru", config.MAIL_FROM)

    def test_invalid_sender_is_rejected(self):
        self.configure(mail_from="noreply@pixelstart.local")
        with self.assertRaises(ValueError):
            get_email_config()


if __name__ == "__main__":
    unittest.main()
