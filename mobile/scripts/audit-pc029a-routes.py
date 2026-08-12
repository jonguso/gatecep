#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"

ROUTE_REF = re.compile(
    r"router\.(?:push|replace)\(\s*[\"']([^\"']+)[\"']"
)

def route_from_file(path: Path):
    rel = path.relative_to(APP).as_posix()

    if rel.endswith("/_layout.js") or rel == "_layout.js":
        return None

    rel = re.sub(r"\.(js|jsx)$", "", rel)

    parts = [
        p for p in rel.split("/")
        if not (p.startswith("(") and p.endswith(")"))
    ]

    if parts and parts[-1] == "index":
        parts = parts[:-1]

    if not parts:
        return "/"

    return "/" + "/".join(parts)

def main():
    route_files = list(APP.rglob("*.js")) + list(APP.rglob("*.jsx"))
    routes = {}

    for path in sorted(set(route_files)):
        route = route_from_file(path)
        if route:
            routes.setdefault(route, []).append(path)

    refs = []
    for base in [APP, ROOT / "src"]:
        for path in list(base.rglob("*.js")) + list(base.rglob("*.jsx")):
            try:
                text = path.read_text(encoding="utf-8")
            except Exception:
                continue

            for match in ROUTE_REF.finditer(text):
                target = match.group(1)
                if "${" in target or "?" in target:
                    continue
                refs.append((target, path))

    targets = sorted(set(target for target, _ in refs))

    print("===== VALID ROUTES REFERENCED =====")
    for target in targets:
        if target in routes:
            print(f"OK     {target}")

    print()
    print("===== BROKEN / UNRESOLVED ROUTES =====")
    broken = []

    for target in targets:
        if target not in routes:
            broken.append(target)
            sources = sorted({
                str(p.relative_to(ROOT))
                for t, p in refs
                if t == target
            })
            print(f"BROKEN {target}")
            for source in sources:
                print(f"       <- {source}")

    print()
    print("===== ROUTE DUPLICATES =====")
    for route, files in sorted(routes.items()):
        if len(files) > 1:
            print(f"DUP    {route}")
            for path in files:
                print(f"       {path.relative_to(ROOT)}")

    print()
    print("===== PATCH / BACKUP FILES INSIDE app =====")
    suspicious = []
    for path in sorted(APP.rglob("*")):
        if not path.is_file():
            continue
        name = path.name.lower()
        if (
            "patch" in name
            or "backup" in name
            or ".bak" in name
            or "-integration" in name
        ):
            suspicious.append(path)
            print(path.relative_to(ROOT))

    print()
    print("===== SUMMARY =====")
    print(f"Route count: {len(routes)}")
    print(f"Referenced route targets: {len(targets)}")
    print(f"Broken route targets: {len(broken)}")
    print(f"Suspicious app files: {len(suspicious)}")

if __name__ == "__main__":
    main()
