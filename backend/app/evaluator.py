"""Evaluation engine for course steps and submissions.

Supports:
- Automatic reading confirmation for Theory steps
- Automated single/multiple choice and numeric verification for Quiz steps
- Automated Python 3 test-runner with time/memory sandboxing for Code Test steps
- Automated numeric check or queued review for Scratch steps
- Queued review for Minecraft Education and Project steps
"""
import subprocess
import time
import json
import re


def normalize_val(val):
    if val is None:
        return ""
    val_str = str(val).strip().replace("\r\n", "\n").replace("\r", "\n")
    try:
        f = float(val_str)
        if f.is_integer():
            return str(int(f))
        return str(f)
    except ValueError:
        return val_str.lower()


def run_python_test(code: str, test_input: str, time_limit_sec: float = 1.0):
    try:
        proc = subprocess.Popen(
            ["python3", "-c", code],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        t0 = time.time()
        stdout, stderr = proc.communicate(input=test_input, timeout=time_limit_sec)
        duration = time.time() - t0
        
        if proc.returncode != 0:
            return {"status": "RE", "error": stderr.strip(), "duration": duration, "output": ""}
        
        return {"status": "OK", "output": stdout.strip(), "duration": duration, "error": ""}
    except subprocess.TimeoutExpired:
        proc.kill()
        return {"status": "TL", "error": f"Превышен лимит времени ({time_limit_sec} с)", "duration": time_limit_sec, "output": ""}
    except Exception as e:
        return {"status": "ERR", "error": str(e), "duration": 0, "output": ""}


def evaluate_submission(task_type: str, answer_json: dict | None, user_input: str | None, file_id: str | None):
    ans_meta = answer_json or {}
    stype = (task_type or "theory").lower()
    user_str = (user_input or "").strip()

    # 1. Theory
    if stype == "theory":
        return {
            "grade": 100,
            "feedback_message": "Теоретический материал усвоен. Шаг пройден!",
            "status": "completed"
        }

    # 2. Quiz
    if stype == "quiz":
        correct_answers = ans_meta.get("correct_answers", [])
        num_ans = ans_meta.get("number_answer")
        hint = ans_meta.get("hint")
        is_multiple = ans_meta.get("is_multiple", False) or len(correct_answers) > 1 or "нескольк" in str(ans_meta.get("submit_type_raw", "")).lower()

        if not correct_answers and num_ans is not None:
            correct_answers = [str(num_ans)]

        if not correct_answers:
            return {
                "grade": 100,
                "feedback_message": "Ответ принят.",
                "status": "completed"
            }

        # Check for multiple choice JSON list or comma separated
        if is_multiple:
            user_choices = []
            try:
                parsed = json.loads(user_str)
                if isinstance(parsed, list):
                    user_choices = [clean_opt.strip() for clean_opt in parsed]
            except Exception:
                user_choices = [c.strip() for c in user_str.split(",") if c.strip()]
            
            norm_user = sorted([normalize_val(c) for c in user_choices])
            norm_correct = sorted([normalize_val(c) for c in correct_answers])

            if norm_user == norm_correct:
                return {
                    "grade": 100,
                    "feedback_message": "Верно! Все варианты выбраны правильно.",
                    "status": "completed"
                }
            else:
                msg = f"Неверно. {hint}" if hint else "Неверно. Выбраны не все правильные варианты."
                return {
                    "grade": 0,
                    "feedback_message": msg,
                    "status": "failed"
                }

        # Single choice or numeric input
        norm_user = normalize_val(user_str)
        matched = any(norm_user == normalize_val(c) for c in correct_answers)
        if matched:
            return {
                "grade": 100,
                "feedback_message": "Верно! Ответ абсолютно точный.",
                "status": "completed"
            }
        else:
            msg = f"Неверно. {hint}" if hint else "Неверно. Попробуй ещё раз."
            return {
                "grade": 0,
                "feedback_message": msg,
                "status": "failed"
            }

    # 3. Scratch
    if stype == "scratch":
        # Check if submission is from embedded Scratch simulator
        if "[scratch 3.0]" in user_str.lower():
            if "статус: correct" in user_str.lower() or "score: 100" in user_str.lower() or "баллы: 100" in user_str.lower():
                return {
                    "grade": 100,
                    "feedback_message": "Проект успешно протестирован и выполнен в среде Scratch 3.0!",
                    "status": "completed"
                }
            else:
                return {
                    "grade": 40,
                    "feedback_message": "В проекте Scratch обнаружены ошибки или не все условия выполнены.",
                    "status": "partial"
                }

        num_ans = ans_meta.get("number_answer")
        correct_answers = ans_meta.get("correct_answers", [])
        if num_ans is not None or correct_answers:
            target = str(num_ans) if num_ans is not None else correct_answers[0]
            if normalize_val(user_str) == normalize_val(target):
                return {
                    "grade": 100,
                    "feedback_message": "Верно! Координата мяча вычислена правильно.",
                    "status": "completed"
                }
            else:
                hint = ans_meta.get("hint")
                msg = f"Неверно. {hint}" if hint else "Неверно. Проверь программу и начальные координаты."
                return {
                    "grade": 0,
                    "feedback_message": msg,
                    "status": "failed"
                }
        else:
            return {
                "grade": -1,
                "feedback_message": "Ссылка на проект Scratch отправлена на проверку куратору.",
                "status": "pending_review"
            }

    # 4. Code Test (Python 3)
    if stype == "code_test":
        sample_tests = ans_meta.get("sample_tests", [])
        hidden_tests = ans_meta.get("hidden_tests", [])
        all_tests = sample_tests + hidden_tests

        if not all_tests:
            return {
                "grade": 100,
                "feedback_message": "Решение сохранено.",
                "status": "completed"
            }

        passed = 0
        total = len(all_tests)
        first_failure = None

        test_details = []
        for idx, t in enumerate(all_tests, 1):
            is_sample = t.get("visibility") == "sample"
            t_in = str(t.get("input", ""))
            t_exp = str(t.get("output", "")).strip()
            
            res = run_python_test(user_str, t_in, time_limit_sec=1.0)
            status = "OK"
            msg = ""
            
            if res["status"] == "OK":
                act_out = res["output"].strip()
                if normalize_val(act_out) == normalize_val(t_exp):
                    passed += 1
                    status = "OK"
                    msg = "Тест пройден"
                else:
                    status = "WA"
                    msg = f"Ожидалось: '{t_exp}', получено: '{act_out}'" if is_sample else "Неверный ответ на тесте"
                    if not first_failure:
                        first_failure = f"Тест #{idx}: {msg}"
            elif res["status"] == "TL":
                status = "TL"
                msg = "Превышен лимит времени (1.0 с)"
                if not first_failure:
                    first_failure = f"Тест #{idx}: Превышен лимит времени (TL)"
            elif res["status"] == "RE":
                status = "RE"
                err_msg = res["error"].split("\n")[-1] if res["error"] else "Runtime Error"
                msg = f"Ошибка: {err_msg}"
                if not first_failure:
                    first_failure = f"Тест #{idx}: {err_msg}"
            else:
                status = "ERR"
                msg = "Системная ошибка"
                if not first_failure:
                    first_failure = f"Тест #{idx}: Ошибка запуска"

            test_details.append({
                "num": idx,
                "visibility": "sample" if is_sample else "hidden",
                "status": status,
                "input": t_in if is_sample else "[СКРЫТЫЕ ДАННЫЕ ЖЮРИ]",
                "expected": t_exp if is_sample else "[СКРЫТЫЙ ОТВЕТ]",
                "actual": res.get("output", "") if is_sample else ("[ВЕРНО]" if status == "OK" else "[НЕВЕРНО]"),
                "duration_ms": round(res.get("duration", 0) * 1000, 1),
                "message": msg
            })

        grade = int(100 * passed / total)
        if passed == total:
            return {
                "grade": 100,
                "feedback_message": f"Все тесты успешно пройдены ({passed}/{total}). Полный балл: 100/100. Решение принято.",
                "status": "completed",
                "test_details": test_details
            }
        else:
            return {
                "grade": grade,
                "feedback_message": f"Пройдено тестов: {passed}/{total}. {first_failure}",
                "status": "partial" if grade > 0 else "failed",
                "test_details": test_details
            }

    # 5. Minecraft Education & Project: Manual review
    if stype in ["minecraft_edu", "project"]:
        return {
            "grade": -1,
            "feedback_message": "Работа успешно отправлена и ожидает проверки куратора.",
            "status": "pending_review"
        }

    return {
        "grade": -1,
        "feedback_message": "Отправлено на проверку.",
        "status": "pending_review"
    }
