from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]/"mobile"
MARKER="PC-030M20AV3P RESPONSIVE CALIBRATION"

targets = {
"app/alerts.js": 110,
"app/analysis-ready.js": 90,
"app/behavior-analytics.js": 110,
"app/corporate-actions.js": 110,
"app/investor-home.js": 40,
"app/investor-timeline.js": 110,
"app/live-dashboard.js": 120,
"app/portfolio-activity.js": 120,
"app/progress.js": 40,
"app/recommendation-history.js": 90,
"app/security/[symbol].js": 120,
}

def find_content_block(src, rel):
    # Match only a StyleSheet "content" object and stop at its own closing brace.
    # This accepts multiline/spacing differences that AV3O normalized in its report.
    m=re.search(r'(?ms)^\s*content\s*:\s*\{(?P<body>[^{}]*)\}', src)
    if not m:
        raise SystemExit(f"STOP — could not locate a simple StyleSheet content block in {rel}.")
    return m

def has_numeric(body, prop, value):
    return re.search(rf'\b{re.escape(prop)}\s*:\s*{value}\b', body) is not None

def patch_body(body, rel, expected_bottom):
    # Safety: target must still look like the exact screen family discovered by AV3O.
    if not re.search(r'\bpadding\s*:\s*(18|20|22)\b', body):
        raise SystemExit(f"STOP — {rel} content block no longer has expected base padding.")
    if not re.search(r'\bpaddingTop\s*:\s*(54|60|64|70)\b', body):
        raise SystemExit(f"STOP — {rel} content block no longer has expected top padding.")
    if not has_numeric(body, "paddingBottom", expected_bottom):
        raise SystemExit(
            f"STOP — {rel} expected paddingBottom {expected_bottom} not found; "
            "no broad fallback patch attempted."
        )

    # Preserve all existing properties except the old paddingBottom.
    body2=re.sub(r'(?m)(?:^|,)\s*paddingBottom\s*:\s*\d+\s*(?=,|$)', '', body, count=1)
    body2=body2.strip()
    body2=re.sub(r'^\s*,\s*','',body2)
    body2=re.sub(r'\s*,\s*$','',body2)

    prefix=f' /* {MARKER} */ width: "100%", maxWidth: 960, alignSelf: "center", '
    return prefix + body2 + ', paddingBottom: 128 '

changed=[]
validated=[]

for rel, expected_bottom in targets.items():
    p=ROOT/rel
    if not p.exists():
        raise SystemExit(f"MISSING — {rel}")
    src=p.read_text(encoding="utf-8")

    # Partial-apply recovery: validate already-applied target and continue.
    if MARKER in src:
        if not re.search(r'maxWidth\s*:\s*960',src) or not re.search(r'paddingBottom\s*:\s*128',src):
            raise SystemExit(f"STOP — {rel} has AV3P marker but incomplete responsive properties.")
        print(f"VALIDATED ALREADY APPLIED — {rel}")
        validated.append(rel)
        continue

    m=find_content_block(src, rel)
    body=m.group("body")
    newbody=patch_body(body, rel, expected_bottom)
    out=src[:m.start("body")] + newbody + src[m.end("body"):]

    backup=p.with_suffix(p.suffix+".pc030m20av3p1.bak")
    if not backup.exists():
        backup.write_text(src,encoding="utf-8")
    p.write_text(out,encoding="utf-8")
    changed.append(rel)
    print(f"UPDATED — {rel}")

print(f"PC-030M20AV3P1 recovery applied successfully. Updated {len(changed)}; validated {len(validated)} already applied.")
print("PRESERVED — no routes, services, state mutations, financial logic, watchlist logic, or investor evidence logic are changed.")
