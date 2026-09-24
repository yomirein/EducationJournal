"""Checks for the presentation curriculum and its evaluation rules."""

import json
import unittest
from pathlib import Path

from backend.app.api.endpoints.courses import sanitize_task_meta
from backend.app.evaluator import evaluate_submission, validate_student_code
from backend.app.models import UserRole


FIXTURE = Path(__file__).resolve().parents[1] / "backend/app/fixtures/case_curriculum.json"


class CurriculumChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.courses = json.loads(FIXTURE.read_text(encoding="utf-8"))
        cls.steps = [step for course in cls.courses for module in course["modules"] for step in module["steps"]]

    def test_program_structure(self):
        self.assertEqual(3, len(self.courses))
        self.assertEqual(9, sum(len(course["modules"]) for course in self.courses))
        self.assertEqual(30, len(self.steps))
        self.assertEqual(30, len({step["step_num"] for step in self.steps}))

    def test_student_payload_has_no_answer_keys(self):
        for step in self.steps:
            with self.subTest(step=step["step_num"]):
                safe = sanitize_task_meta(step, UserRole.student)
                for key in ("correct_answers", "number_answer", "hidden_tests", "reference_solution", "criteria", "hint"):
                    self.assertNotIn(key, safe)
                self.assertEqual(step, sanitize_task_meta(step, UserRole.curator))

    def test_quiz_answer_keys(self):
        for step in self.steps:
            if step["step_type"] != "quiz":
                continue
            with self.subTest(step=step["step_num"]):
                answers = step["correct_answers"]
                self.assertTrue(answers)
                answer = json.dumps(answers, ensure_ascii=False) if step["is_multiple"] else answers[0]
                result = evaluate_submission("quiz", step, answer, None)
                self.assertEqual(100, result["grade"])

    def test_python_reference_solutions_pass_all_tests(self):
        for step in self.steps:
            if step["step_type"] != "code_test":
                continue
            with self.subTest(step=step["step_num"]):
                self.assertGreaterEqual(len(step["sample_tests"]), 2)
                self.assertGreaterEqual(len(step["hidden_tests"]), 4)
                code = step["reference_solution"]
                self.assertIsNone(validate_student_code(code))
                result = evaluate_submission("code_test", step, code, None)
                self.assertEqual(100, result["grade"], result)
                self.assertEqual(len(step["sample_tests"]) + len(step["hidden_tests"]), len(result["test_details"]))

    def test_unconfigured_tasks_do_not_pass_automatically(self):
        self.assertEqual(-1, evaluate_submission("quiz", {}, "anything", None)["grade"])
        self.assertEqual(-1, evaluate_submission("code_test", {}, "print(1)", None)["grade"])
        self.assertEqual(-1, evaluate_submission("scratch", {}, "https://scratch.mit.edu/projects/1", None)["grade"])

    def test_python_subset_blocks_system_access(self):
        for code in ("import os", "open('/etc/passwd')", "print((1).__class__)"):
            with self.subTest(code=code):
                self.assertIsNotNone(validate_student_code(code))


if __name__ == "__main__":
    unittest.main()
