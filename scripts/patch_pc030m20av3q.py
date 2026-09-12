from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
MARKER="PC-030M20AV3Q RESPONSIVE CALIBRATION"

targets = {
    "app/dividend-center.js": {
        "padding": 22,
        "paddingTop": 70,
        "paddingBottom": 110,
    },
    "app/monthly-review.js": {
        "padding": 22,
        "paddingTop": 70,
        "paddingBottom": 110,
    },
}

def locate_content(src, rel):
    m=re.search(r'(?ms)^\s*content\s*:\s*\{(?P<body>[^{}]*)\}', src)
    if not m:
        raise SystemExit(f"STOP — could not locate simple StyleSheet content block in {rel}.")
    return m

def require_prop(body, prop, value, rel):
    if not re.search(rf'\b{re.escape(prop)}\s*:\s*{value}\b', body):
        raise SystemExit(f"STOP — {rel} expected {prop}: {value} not found.")

for rel, expected in targets.items():
    p=ROOT/rel
    if not p.exists():
        raise SystemExit(f"MISSING — {rel}")

    src=p.read_text(encoding="utf-8")

    if MARKER in src:
        if not all(re.search(pattern, src) for pattern in [
            r'width\s*:\s*"100%"',
            r'maxWidth\s*:\s*960',
            r'alignSelf\s*:\s*"center"',
            r'paddingBottom\s*:\s*128',
        ]):
            raise SystemExit(f"STOP — {rel} has AV3Q marker but incomplete responsive properties.")
        print(f"ALREADY APPLIED — {rel}")
        continue

    m=locate_content(src, rel)
    body=m.group("body")
    require_prop(body,"padding",expected["padding"],rel)
    require_prop(body,"paddingTop",expected["paddingTop"],rel)
    require_prop(body,"paddingBottom",expected["paddingBottom"],rel)

    body2=re.sub(r'(?m)(?:^|,)\s*paddingBottom\s*:\s*\d+\s*(?=,|$)', '', body, count=1)
    body2=body2.strip()
    body2=re.sub(r'^\s*,\s*','',body2)
    body2=re.sub(r'\s*,\s*$','',body2)

    newbody=(
        f' /* {MARKER} */ width: "100%", maxWidth: 960, alignSelf: "center", '
        + body2
        + ', paddingBottom: 128 '
    )

    out=src[:m.start("body")] + newbody + src[m.end("body"):]

    backup=p.with_suffix(p.suffix+".pc030m20av3q.bak")
    if not backup.exists():
        backup.write_text(src,encoding="utf-8")
    p.write_text(out,encoding="utf-8")
    print(f"UPDATED — {rel}")

print("PC-030M20AV3Q applied successfully.")
print("PRESERVED — dividend record persistence, delete/receive flows, and monthly review snapshot persistence are unchanged.")
print("PRESERVED — no routes, services, record mutations, portfolio evidence, or review logic are modified.")
