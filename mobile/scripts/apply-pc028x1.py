#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"

COACH = ROOT / "app" / "(tabs)" / "coach.js"
WEALTH = ROOT / "app" / "wealth-journey.js"

COACH_IMPORT = (
    'import CoachGReconciliationCard from '
    '"../../src/features/wealth-journey/components/CoachGReconciliationCard";'
)

WEALTH_IMPORT = (
    'import CoachGReconciliationCard from '
    '"../src/features/wealth-journey/components/CoachGReconciliationCard";'
)

def backup(path):
    backup_path = path.with_suffix(path.suffix + ".pc028x1.bak")
    shutil.copy2(path, backup_path)
    return backup_path

def insert_import(text, import_line):
    if import_line in text:
        return text, False

    lines = text.splitlines(keepends=True)

    # Insert after the final import declaration. This supports both one-line
    # imports and multi-line imports ending with a semicolon.
    last_import_end = None
    in_import = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        if stripped.startswith("import "):
            in_import = True

        if in_import and stripped.endswith(";"):
            last_import_end = i + 1
            in_import = False

    if last_import_end is None:
        raise RuntimeError("Unable to locate import block.")

    lines.insert(last_import_end, "\n" + import_line + "\n")
    return "".join(lines), True

def patch_coach():
    if not COACH.exists():
        raise FileNotFoundError(COACH)

    original = COACH.read_text(encoding="utf-8")
    text, _ = insert_import(original, COACH_IMPORT)

    component = '      <CoachGReconciliationCard compact={true} />'

    if component not in text:
        # Exact anchor from the current Coach screen shown by the user.
        anchor = '      <Text style={styles.title}>Coach G Insights</Text>'

        if anchor not in text:
            raise RuntimeError(
                "Coach title anchor not found in app/(tabs)/coach.js"
            )

        text = text.replace(
            anchor,
            anchor + "\n\n" + component,
            1
        )

    if text == original:
        return {
            "file": str(COACH),
            "status": "ALREADY_APPLIED"
        }

    b = backup(COACH)
    COACH.write_text(text, encoding="utf-8")

    return {
        "file": str(COACH),
        "status": "PATCHED",
        "backup": str(b)
    }

def patch_wealth():
    if not WEALTH.exists():
        raise FileNotFoundError(WEALTH)

    original = WEALTH.read_text(encoding="utf-8")
    text, _ = insert_import(original, WEALTH_IMPORT)

    component = '        <CoachGReconciliationCard compact={false} />'

    if component not in text:
        # The current Wealth Journey screen previously showed ReadinessBanner.
        # Put Coach G reconciliation immediately before readiness so the
        # investor sees the most important clarification first.
        anchor = '        <ReadinessBanner'

        if anchor in text:
            text = text.replace(
                anchor,
                component + "\n\n" + anchor,
                1
            )
        else:
            # Secondary fallback for formatting differences.
            anchor = '<ReadinessBanner'

            if anchor not in text:
                raise RuntimeError(
                    "Wealth Journey ReadinessBanner anchor not found."
                )

            pos = text.find(anchor)
            line_start = text.rfind("\n", 0, pos) + 1
            indentation = text[line_start:pos]

            text = (
                text[:line_start] +
                indentation +
                '<CoachGReconciliationCard compact={false} />\n\n' +
                text[line_start:]
            )

    if text == original:
        return {
            "file": str(WEALTH),
            "status": "ALREADY_APPLIED"
        }

    b = backup(WEALTH)
    WEALTH.write_text(text, encoding="utf-8")

    return {
        "file": str(WEALTH),
        "status": "PATCHED",
        "backup": str(b)
    }

def main():
    results = [
        patch_coach(),
        patch_wealth()
    ]

    print("PC-028X1 applied.")

    for result in results:
        print(result)

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
