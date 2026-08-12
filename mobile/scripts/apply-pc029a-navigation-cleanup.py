#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes"

REPLACEMENTS = {
    'router.push("/dashboard")':
        'router.push("/(tabs)/dashboard")',

    'router.replace("/dashboard")':
        'router.replace("/(tabs)/dashboard")',

    'router.push("/trading")':
        'router.push("/(tabs)/trading")',

    'router.replace("/trading")':
        'router.replace("/(tabs)/trading")',

    'router.push("/coach")':
        'router.push("/(tabs)/coach")',

    'router.replace("/coach")':
        'router.replace("/(tabs)/coach")',

    'router.push("/funds")':
        'router.push("/(tabs)/funds")',

    'router.replace("/funds")':
        'router.replace("/(tabs)/funds")',

    'router.push("/portfolio")':
        'router.push("/portfolio-hub")',

    'router.replace("/portfolio")':
        'router.replace("/portfolio-hub")'
}

KNOWN_UNRESOLVED = {
    "/holdings-import",
    "/oms-orders"
}

def backup(path):
    b = path.with_suffix(path.suffix + ".pc029a.bak")
    shutil.copy2(path, b)
    return b

def normalize_routes():
    changed = []

    for base in [APP, ROOT / "src"]:
        for path in sorted(list(base.rglob("*.js")) + list(base.rglob("*.jsx"))):
            try:
                original = path.read_text(encoding="utf-8")
            except Exception:
                continue

            text = original
            for old, new in REPLACEMENTS.items():
                text = text.replace(old, new)

            if text != original:
                backup(path)
                path.write_text(text, encoding="utf-8")
                changed.append(path)

    return changed

def should_archive(path):
    name = path.name.lower()

    if path.suffix.lower() not in {".js", ".jsx"}:
        return False

    return (
        "patch" in name
        or "backup" in name
        or "-integration" in name
    )

def archive_nonroutes():
    moved = []

    for path in sorted(APP.rglob("*")):
        if not path.is_file() or not should_archive(path):
            continue

        rel = path.relative_to(APP)
        destination = ARCHIVE / rel
        destination.parent.mkdir(parents=True, exist_ok=True)

        if destination.exists():
            stem = destination.stem
            suffix = destination.suffix
            i = 1
            while True:
                candidate = destination.with_name(
                    f"{stem}-{i}{suffix}"
                )
                if not candidate.exists():
                    destination = candidate
                    break
                i += 1

        shutil.move(str(path), str(destination))
        moved.append((path, destination))

    return moved

def main():
    changed = normalize_routes()
    moved = archive_nonroutes()

    print("PC-029A navigation cleanup applied.")
    print()
    print("Normalized route references:")
    for path in changed:
        print(f"  {path.relative_to(ROOT)}")

    print()
    print("Archived non-route JS files:")
    for old, new in moved:
        print(
            f"  {old.relative_to(ROOT)}"
            f" -> {new.relative_to(ROOT)}"
        )

    print()
    print("Intentionally unresolved routes:")
    for route in sorted(KNOWN_UNRESOLVED):
        print(f"  {route}")

    print()
    print(
        "No replacement was guessed for unresolved routes. "
        "Run scripts/audit-pc029a-routes.py next."
    )

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
