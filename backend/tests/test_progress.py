"""Checks the rating rules and early warnings from backend/app/progress.py."""

import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from backend.app.core.security import create_token, decode_token, password_fingerprint
from backend.app.progress import check_kind, expected_percent, is_passed, risk_reasons, summarize


def task(task_id, task_type, meta=None):
    return SimpleNamespace(id=task_id, type=task_type, step_number=f"1.{task_id}", title=None, answer_json=meta or {})


def sub(grade):
    return SimpleNamespace(grade=grade, submitted_at=None)


class RatingRules(unittest.TestCase):
    def test_pass_threshold(self):
        self.assertTrue(is_passed("project", 50))
        self.assertFalse(is_passed("project", 49))
        self.assertFalse(is_passed("code_test", 90))
        self.assertTrue(is_passed("code_test", 100))

    def test_manual_and_auto_grades_count_equally(self):
        tasks = [task(1, "quiz", {"correct_answers": ["a"]}), task(2, "project")]
        summary = summarize(tasks, {1: sub(75), 2: sub(75)})
        self.assertEqual(["auto", "curator"], [step["check"] for step in summary["steps"]])
        self.assertEqual([75, 75], [step["points"] for step in summary["steps"]])
        self.assertEqual(150, summary["points"])

    def test_pending_gives_no_points_and_next_step_skips_it(self):
        tasks = [task(1, "theory"), task(2, "project"), task(3, "quiz")]
        summary = summarize(tasks, {1: sub(100), 2: sub(-1)})
        self.assertEqual(["passed", "pending", "not_started"], [step["status"] for step in summary["steps"]])
        self.assertEqual(100, summary["points"])
        self.assertEqual(3, summary["next_step"]["task_id"])
        self.assertEqual(33, summary["percent"])

    def test_scratch_without_answer_key_is_manual(self):
        self.assertEqual("curator", check_kind(task(1, "scratch")))
        self.assertEqual("auto", check_kind(task(1, "scratch", {"number_answer": 0})))


class EarlyWarnings(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 10, 11, tzinfo=timezone.utc)
        self.stream = SimpleNamespace(
            start_date=datetime(2026, 10, 1, tzinfo=timezone.utc),
            end_date=datetime(2026, 10, 21, tzinfo=timezone.utc),
        )
        self.summary = {"total": 10, "passed": 2, "percent": 20}

    def test_expected_progress_follows_the_timeline(self):
        self.assertEqual(50, expected_percent(self.stream, self.now))

    def test_behind_and_inactive_student_is_flagged(self):
        reasons = risk_reasons(self.summary, 50, self.now - timedelta(days=8), self.stream, self.now)
        self.assertEqual(["Отстаёт от графика потока на 30%", "Не сдавал работы 8 дн."], reasons)

    def test_student_on_track_is_not_flagged(self):
        on_track = {"total": 10, "passed": 5, "percent": 50}
        self.assertEqual([], risk_reasons(on_track, 50, self.now - timedelta(days=1), self.stream, self.now))


class PasswordResetToken(unittest.TestCase):
    def test_link_stops_working_after_password_change(self):
        old_hash, new_hash = "hash-before", "hash-after"
        token = create_token("7", "password_reset", 60, extra={"pwd": password_fingerprint(old_hash)})
        data = decode_token(token, "password_reset")
        self.assertEqual(password_fingerprint(old_hash), data["pwd"])
        self.assertNotEqual(password_fingerprint(new_hash), data["pwd"])
        self.assertIsNone(decode_token(token, "access"))


if __name__ == "__main__":
    unittest.main()
