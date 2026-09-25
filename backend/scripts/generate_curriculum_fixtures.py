import re
import json
import os

def clean_text(text):
    if not text:
        return ""
    # remove trailing and leading whitespace
    text = text.replace('\xa0', ' ')
    return text.strip()

def parse_full_package(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    course_blocks = re.split(r"\n(?=КУРС \d)", content)
    courses = []

    type_mapping = {
        1: "scratch",
        2: "minecraft_edu",
        3: "algorithm"
    }

    for c_idx, c_text in enumerate(course_blocks[1:], 1):
        lines = [clean_text(l) for l in c_text.strip().split("\n") if l.strip()]
        
        title = ""
        grades = ""
        volume = ""
        tool = ""
        goal = ""

        for i, l in enumerate(lines):
            if l.startswith(f"КУРС {c_idx}") and i + 1 < len(lines):
                title = lines[i+1]
            elif l == "Классы" and i + 1 < len(lines):
                grades = lines[i+1]
            elif l == "Объём" and i + 1 < len(lines):
                volume = lines[i+1]
            elif l == "Инструмент" and i + 1 < len(lines):
                tool = lines[i+1]
            elif l == "Цель курса" and i + 1 < len(lines):
                goal = lines[i+1]

        module_blocks = re.split(r"\n(?=Модуль \d\.\d)", c_text)
        modules = []

        for m_idx, m_text in enumerate(module_blocks[1:], 1):
            m_lines = [clean_text(l) for l in m_text.strip().split("\n") if l.strip()]
            m_header = m_lines[0]
            m_code = f"{c_idx}.{m_idx}"
            m_name = m_header
            if m_header.startswith(f"Модуль {m_code}."):
                m_name = m_header[len(f"Модуль {m_code}."):].strip()
            elif m_header.startswith(f"Модуль {m_code}"):
                m_name = m_header[len(f"Модуль {m_code}"):].strip()

            step_blocks = re.split(r"\n(?=Шаг \d\.\d\.\d)", m_text)
            steps = []

            for s_idx, s_text in enumerate(step_blocks[1:], 1):
                s_lines = s_text.strip().split("\n")
                s_header = clean_text(s_lines[0])
                step_code_m = re.match(r"Шаг (\d\.\d\.\d)\.\s*(.*)", s_header)
                step_num = step_code_m.group(1) if step_code_m else f"{m_code}.{s_idx}"
                step_title = clean_text(step_code_m.group(2)) if step_code_m else s_header

                # Passport
                step_type_raw = ""
                check_type_raw = ""
                submit_type_raw = ""

                i = 0
                while i < len(s_lines):
                    line = clean_text(s_lines[i])
                    if line == "Тип шага" and i + 1 < len(s_lines):
                        step_type_raw = clean_text(s_lines[i+1])
                        i += 1
                    elif line == "Проверка" and i + 1 < len(s_lines):
                        check_type_raw = clean_text(s_lines[i+1])
                        i += 1
                    elif line == "Что сдаёт ученик" and i + 1 < len(s_lines):
                        submit_type_raw = clean_text(s_lines[i+1])
                        i += 1
                    i += 1

                # Normalize step_type
                st_lower = step_type_raw.lower()
                if "теория" in st_lower:
                    step_type = "theory"
                elif "контрольный" in st_lower or "вопрос" in st_lower:
                    step_type = "quiz"
                elif "scratch" in st_lower:
                    step_type = "scratch"
                elif "minecraft" in st_lower:
                    step_type = "minecraft_edu"
                elif "тест" in st_lower or "задача" in st_lower:
                    step_type = "code_test"
                elif "проект" in st_lower:
                    step_type = "project"
                else:
                    step_type = "custom"

                # Body lines: starting after "Что сдаёт ученик"
                body_lines = []
                in_body = False
                after_submit = 0
                for line in s_lines:
                    if not in_body:
                        if clean_text(line) == "Что сдаёт ученик":
                            after_submit = 1
                            continue
                        if after_submit == 1:
                            after_submit = 2
                            in_body = True
                            continue
                    else:
                        body_lines.append(line.replace('\xa0', ' '))

                full_body = "\n".join(body_lines).strip()

                # Extract teacher metadata & public content
                options = []
                correct_answers = []
                is_multiple = False
                number_answer = None
                hint = None
                reference_solution = None
                criteria = None
                tests = []
                time_limit = None
                memory_limit = None

                # Check constraints (limits)
                limits_m = re.search(r"Ограничения\s*\n+([^\n]+)", full_body)
                if limits_m:
                    limits_str = clean_text(limits_m.group(1))
                    if "МБ" in limits_str:
                        memory_limit = limits_str.split(",")[-1].strip() if "," in limits_str else limits_str
                    if "сек" in limits_str:
                        time_limit = limits_str.split(",")[0].strip() if "," in limits_str else limits_str

                # Check hint
                hint_m = re.search(r"Подсказка для ученика после неверного ответа:\s*([^\n]+)", full_body)
                if hint_m:
                    hint = clean_text(hint_m.group(1))

                # Check number answer
                ans_m = re.search(r"ПРАВИЛЬНЫЙ ОТВЕТ\s*\n+([^\n]+)", full_body)
                if ans_m:
                    number_answer = clean_text(ans_m.group(1))
                    correct_answers.append(number_answer)

                # Check quiz options
                if step_type == "quiz":
                    opt_matches = re.findall(r"([○✓□])\s+(.*?)(?=\n[○✓□]|\nПРАВИЛЬНЫЙ|\nПодсказка|\nВходные|\nВыходные|\Z)", full_body, re.DOTALL)
                    for mark, opt in opt_matches:
                        clean_opt = re.sub(r"\s+верный\s*$", "", clean_text(opt))
                        options.append(clean_opt)
                        if mark == "✓" or "верный" in opt:
                            correct_answers.append(clean_opt)
                        if mark == "□":
                            is_multiple = True
                    is_multiple = is_multiple or "нескольк" in submit_type_raw.lower() or len(correct_answers) > 1

                # Check reference solution
                ref_m = re.search(r"ЭТАЛОННОЕ РЕШЕНИЕ · ДЛЯ КУРАТОРА\s*\n(.*)", full_body, re.DOTALL)
                if ref_m:
                    reference_solution = clean_text(ref_m.group(1))

                # Check criteria
                crit_m = re.search(r"КРИТЕРИИ ПРОВЕРКИ · ДЛЯ КУРАТОРА\s*\n(.*?)(?=\n[А-ЯA-Z\s]{4,}|\Z)", full_body, re.DOTALL)
                if crit_m:
                    criteria = clean_text(crit_m.group(1))

                # Check test cases
                tests_section = re.search(r"ТЕСТЫ\s*·\s*(\d+)\s*\n(.*?)(?=ЭТАЛОННОЕ РЕШЕНИЕ|\Z)", full_body, re.DOTALL)
                if tests_section:
                    t_lines = [clean_text(l) for l in tests_section.group(2).strip().split("\n") if l.strip()]
                    t_lines = [l for l in t_lines if l not in ("№", "Входные данные", "Ответ", "Видимость")]
                    row = []
                    for line in t_lines:
                        row.append(line)
                        if line not in ("пример в условии", "скрытый"):
                            continue
                        # The input cell can contain multiple lines (for example, three class sizes).
                        if len(row) < 4 or row[0] != str(len(tests) + 1):
                            raise ValueError(f"Некорректная таблица тестов в шаге {step_num}: {row!r}")
                        tests.append({
                            "num": int(row[0]),
                            "input": "\n".join(row[1:-2]),
                            "output": row[-2],
                            "visibility": "sample" if "пример" in line else "hidden"
                        })
                        row = []
                    if row or len(tests) != int(tests_section.group(1)):
                        raise ValueError(f"Ожидалось {tests_section.group(1)} тестов в шаге {step_num}, получено {len(tests)}")

                # Clean public description for student: remove answers, tests table, criteria, reference solutions
                public_desc = full_body
                if "ПРАВИЛЬНЫЙ ОТВЕТ" in public_desc:
                    public_desc = public_desc.split("ПРАВИЛЬНЫЙ ОТВЕТ")[0].strip()
                if "ТЕСТЫ" in public_desc:
                    public_desc = public_desc.split("ТЕСТЫ")[0].strip()
                if "КРИТЕРИИ ПРОВЕРКИ" in public_desc:
                    public_desc = public_desc.split("КРИТЕРИИ ПРОВЕРКИ")[0].strip()
                if "ЭТАЛОННОЕ РЕШЕНИЕ" in public_desc:
                    public_desc = public_desc.split("ЭТАЛОННОЕ РЕШЕНИЕ")[0].strip()
                if "Подсказка для ученика" in public_desc:
                    public_desc = public_desc.split("Подсказка для ученика")[0].strip()

                # Clean options if quiz
                if options:
                    public_desc = re.sub(r"ВАРИАНТЫ · [^\n]+\n.*", "", public_desc, flags=re.DOTALL).strip()

                steps.append({
                    "step_num": step_num,
                    "title": step_title,
                    "step_type": step_type,
                    "step_type_raw": step_type_raw,
                    "check_type_raw": check_type_raw,
                    "submit_type_raw": submit_type_raw,
                    "description": public_desc,
                    "options": options,
                    "correct_answers": correct_answers,
                    "is_multiple": is_multiple,
                    "number_answer": number_answer,
                    "hint": hint,
                    "time_limit": time_limit,
                    "memory_limit": memory_limit,
                    "sample_tests": [t for t in tests if t["visibility"] == "sample"],
                    "hidden_tests": [t for t in tests if t["visibility"] == "hidden"],
                    "reference_solution": reference_solution,
                    "criteria": criteria
                })

            modules.append({
                "module_num": m_code,
                "name": m_name,
                "steps": steps
            })

        courses.append({
            "course_num": c_idx,
            "title": title,
            "type": type_mapping.get(c_idx, "general"),
            "grades": grades,
            "volume": volume,
            "tool": tool,
            "goal": goal,
            "modules": modules
        })

    return courses

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOURCE = os.path.join(ROOT, "docs", "case_document_full.md")
FIXTURES_DIR = os.path.join(ROOT, "backend", "app", "fixtures")

os.makedirs(FIXTURES_DIR, exist_ok=True)
curriculum = parse_full_package(SOURCE)
with open(os.path.join(FIXTURES_DIR, "case_curriculum.json"), "w", encoding="utf-8") as out:
    json.dump(curriculum, out, ensure_ascii=False, indent=2)

print("Saved to backend/app/fixtures/case_curriculum.json successfully!")
print(f"Total courses: {len(curriculum)}")
for c in curriculum:
    print(f"Course {c['course_num']} ({c['title']}): {len(c['modules'])} modules, {sum(len(m['steps']) for m in c['modules'])} steps.")
