#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"

ROUTE_REF = re.compile(r"router\.(?:push|replace)\(\s*[\"']([^\"']+)[\"']")

def file_routes(path):
    rel = path.relative_to(APP).as_posix()

    if rel.endswith("/_layout.js") or rel.endswith("/_layout.jsx") or rel in {"_layout.js", "_layout.jsx"}:
        return set()

    rel = re.sub(r"\.(js|jsx)$", "", rel)
    parts = rel.split("/")

    if parts and parts[-1] == "index":
        parts = parts[:-1]

    public_parts = [
        p for p in parts
        if not (p.startswith("(") and p.endswith(")"))
    ]

    public_route = "/" + "/".join(public_parts) if public_parts else "/"
    qualified_route = "/" + "/".join(parts) if parts else "/"

    return {public_route, qualified_route}

def main():
    valid_routes = set()

    for path in sorted(set(list(APP.rglob("*.js")) + list(APP.rglob("*.jsx")))):
        valid_routes.update(file_routes(path))

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
    broken = []

    print("===== VALID STATIC ROUTE TARGETS =====")
    for target in targets:
        if target in valid_routes:
            print(f"OK     {target}")
        else:
            broken.append(target)

    print()
    print("===== BROKEN STATIC ROUTE TARGETS =====")
    if not broken:
        print("NONE")
    else:
        for target in broken:
            print(f"BROKEN {target}")
            sources = sorted({
                str(path.relative_to(ROOT))
                for ref, path in refs
                if ref == target
            })
            for source in sources:
                print(f"       <- {source}")

    print()
    print("===== NAVIGATION AUDIT SUMMARY =====")
    print(f"Valid route forms: {len(valid_routes)}")
    print(f"Referenced static targets: {len(targets)}")
    print(f"Broken static targets: {len(broken)}")

    if broken:
        raise SystemExit(2)

if __name__ == "__main__":
    main()
