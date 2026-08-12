#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
COACH = ROOT / "app" / "(tabs)" / "coach.js"
WEALTH = ROOT / "app" / "wealth-journey.js"

CARD_IMPORT_COACH = 'import CoachGReconciliationCard from "../../src/features/wealth-journey/components/CoachGReconciliationCard";\n'
CARD_IMPORT_WEALTH = 'import CoachGReconciliationCard from "../src/features/wealth-journey/components/CoachGReconciliationCard";\n'

def backup(path):
    b = path.with_suffix(path.suffix + ".pc028x.bak")
    shutil.copy2(path, b)
    return b

def insert_after_imports(text, import_line):
    if import_line.strip() in text:
        return text, False

    lines = text.splitlines(keepends=True)
    last_import_end = None
    in_import = False

    for index, line in enumerate(lines):
        stripped = line.strip()

        if stripped.startswith("import "):
            in_import = True

        if in_import and stripped.endswith(";"):
            last_import_end = index + 1
            in_import = False

    if last_import_end is None:
        raise RuntimeError("Unable to locate import section.")

    lines.insert(last_import_end, "\n" + import_line)
    return "".join(lines), True

def insert_card(text, component):
    if component.strip() in text:
        return text, False

    anchors = [
        "<ActiveUserBanner />",
        "<CoachReflectionCard",
        "<DailyLessonCard",
        "<ReadinessBanner",
        "<CoachPriority"
    ]

    for anchor in anchors:
        pos = text.find(anchor)
        if pos < 0:
            continue

        if anchor == "<ActiveUserBanner />":
            end = pos + len(anchor)
            return text[:end] + "\n\n" + component + text[end:], True

        return text[:pos] + component + "\n\n      " + text[pos:], True

    return text, False

def patch_file(path, import_line, component):
    if not path.exists():
        return {
            "file": str(path),
            "status": "NOT_FOUND"
        }

    original = path.read_text(encoding="utf-8")
    text, _ = insert_after_imports(original, import_line)
    text, card_changed = insert_card(text, component)

    if not card_changed and component.strip() not in text:
        raise RuntimeError(
            f"Card insertion anchor not found in {path}"
        )

    if text == original:
        return {
            "file": str(path),
            "status": "ALREADY_APPLIED"
        }

    b = backup(path)
    path.write_text(text, encoding="utf-8")

    return {
        "file": str(path),
        "status": "PATCHED",
        "backup": str(b)
    }

def main():
    results = [
        patch_file(
            COACH,
            CARD_IMPORT_COACH,
            '      <CoachGReconciliationCard compact={true} />'
        ),
        patch_file(
            WEALTH,
            CARD_IMPORT_WEALTH,
            '      <CoachGReconciliationCard compact={false} />'
        )
    ]

    print("PC-028X UI integration applied.")
    for result in results:
        print(result)

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
