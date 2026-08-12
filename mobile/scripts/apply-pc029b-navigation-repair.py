#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes"

REPLACEMENTS = {
    'router.push("/holdings-import")': 'router.push("/manual-portfolio-entry")',
    'router.replace("/holdings-import")': 'router.replace("/manual-portfolio-entry")',
    'router.push("/oms-orders")': 'router.push("/orders")',
    'router.replace("/oms-orders")': 'router.replace("/orders")'
}

def backup(path):
    b = path.with_suffix(path.suffix + ".pc029b.bak")
    shutil.copy2(path, b)
    return b

def patch_routes():
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

def archive_baks():
    moved = []
    candidates = [
        p for p in sorted(APP.rglob("*"))
        if p.is_file() and ".bak" in p.name.lower()
    ]

    for path in candidates:
        rel = path.relative_to(APP)
        destination = ARCHIVE / "bak" / rel
        destination.parent.mkdir(parents=True, exist_ok=True)

        if destination.exists():
            stem = destination.stem
            suffix = destination.suffix
            i = 1
            while True:
                candidate = destination.with_name(f"{stem}-{i}{suffix}")
                if not candidate.exists():
                    destination = candidate
                    break
                i += 1

        shutil.move(str(path), str(destination))
        moved.append((path, destination))

    return moved

def main():
    changed = patch_routes()
    moved = archive_baks()

    print("PC-029B navigation repair applied.")
    print()
    print("Route fixes:")
    for path in changed:
        print(f"  {path.relative_to(ROOT)}")

    print()
    print("Archived .bak files:")
    for old, new in moved:
        print(f"  {old.relative_to(ROOT)} -> {new.relative_to(ROOT)}")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
