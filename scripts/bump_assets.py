"""Set one cache-busting version on every asset link in front/*.html (simulators excluded).

Usage: python scripts/bump_assets.py [VERSION]
Default version is today's date plus a counter, e.g. 2026092601.
"""
import re
import sys
from datetime import date
from pathlib import Path

FRONT = Path(__file__).resolve().parent.parent / "front"
LINK = re.compile(r"(assets/[\w./-]+\.(?:js|css))\?v=\d+")


def main() -> None:
    version = sys.argv[1] if len(sys.argv) > 1 else date.today().strftime("%Y%m%d") + "01"
    changed = 0

    for page in FRONT.rglob("*.html"):
        if "simulators" in page.parts:
            continue

        text = page.read_text(encoding="utf-8")
        updated = LINK.sub(rf"\1?v={version}", text)

        if updated != text:
            page.write_text(updated, encoding="utf-8")
            changed += 1

    print(f"v={version}: {changed} pages updated")


if __name__ == "__main__":
    main()
