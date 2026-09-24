import ast
import sys

files = [
    'backend/app/core/email.py',
    'backend/app/services.py',
    'backend/app/api/endpoints/auth.py',
    'backend/app/models.py',
    'backend/app/core/config.py',
]

for f in files:
    try:
        with open(f, 'r') as file:
            ast.parse(file.read())
        print(f"✓ {f}")
    except SyntaxError as e:
        print(f"✗ {f}: {e}")
        sys.exit(1)

print("\n✓ All Python files are syntactically correct")
