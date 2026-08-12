#!/usr/bin/env python3
from pathlib import Path
import os
import re

ROOT = Path(
    os.environ.get(
        "GATECEP_MOBILE_ROOT",
        Path(__file__).resolve().parents[1]
    )
).resolve()
APP = ROOT / "app"

STATIC_ROUTER = re.compile(r'router\.(?:push|replace)\(\s*["\']([^"\']+)["\']')
ROUTE_PROP = re.compile(r'(?:\broute\s*=\s*|\broute\s*:\s*)["\'](/[^"\']+)["\']')

def route_forms(path):
    rel = path.relative_to(APP).as_posix()

    if rel in {"_layout.js", "_layout.jsx"} or rel.endswith("/_layout.js") or rel.endswith("/_layout.jsx"):
        return set()

    rel = re.sub(r"\.(js|jsx)$", "", rel)
    parts = rel.split("/")

    if parts and parts[-1] == "index":
        parts = parts[:-1]

    public_parts = [p for p in parts if not (p.startswith("(") and p.endswith(")"))]
    public = "/" + "/".join(public_parts) if public_parts else "/"
    qualified = "/" + "/".join(parts) if parts else "/"

    return {public, qualified}

def main():
    if not APP.is_dir() or not (ROOT / "src").is_dir():
        print(f"ERROR: GateCEP mobile root is incomplete: {ROOT}")
        raise SystemExit(3)

    valid = set()
    for path in set(list(APP.rglob("*.js")) + list(APP.rglob("*.jsx"))):
        valid.update(route_forms(path))

    refs = []
    for base in [APP, ROOT / "src"]:
        for path in list(base.rglob("*.js")) + list(base.rglob("*.jsx")):
            try:
                text = path.read_text(encoding="utf-8")
            except Exception:
                continue

            for pattern, kind in [(STATIC_ROUTER, "router"), (ROUTE_PROP, "route-prop")]:
                for match in pattern.finditer(text):
                    target = match.group(1)
                    if "${" in target or "?" in target:
                        continue
                    refs.append((target, path, kind))

    broken = []
    print("===== PC-029C VISIBLE ROUTE AUDIT =====")

    for target in sorted(set(t for t, _, _ in refs)):
        if target in valid:
            print(f"OK     {target}")
        else:
            broken.append(target)
            print(f"BROKEN {target}")
            for _, path, kind in sorted([x for x in refs if x[0] == target], key=lambda x: str(x[1])):
                print(f"       <- {path.relative_to(ROOT)} [{kind}]")

    print()
    print("===== SUMMARY =====")
    print(f"Valid route forms: {len(valid)}")
    print(f"Referenced visible/static targets: {len(set(t for t,_,_ in refs))}")
    print(f"Broken targets: {len(broken)}")

    if not valid or not refs:
        print("ERROR: Route audit produced an empty contract.")
        raise SystemExit(4)

    if broken:
        raise SystemExit(2)

if __name__ == "__main__":
    main()
