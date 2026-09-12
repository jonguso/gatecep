from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
MARKER="PC-030M20AV3R RESPONSIVE CALIBRATION"

targets = {
    "app/existing-portal.js": {"padding":22,"paddingTop":70,"paddingBottom":40},
    "app/investor-alert-review.js": {"padding":20,"paddingTop":54,"paddingBottom":120},
    "app/my-profile.js": {"padding":22,"paddingTop":70,"paddingBottom":100},
}

def locate_content(src, rel):
    m=re.search(r'(?ms)^\s*content\s*:\s*\{(?P<body>[^{}]*)\}', src)
    if not m:
        raise SystemExit(f"STOP — could not locate simple StyleSheet content block in {rel}.")
    return m

def require(body, prop, val, rel):
    if not re.search(rf'\b{re.escape(prop)}\s*:\s*{val}\b', body):
        raise SystemExit(f"STOP — {rel} expected {prop}: {val} not found.")

for rel, exp in targets.items():
    p=ROOT/rel
    if not p.exists():
        raise SystemExit(f"MISSING — {rel}")
    src=p.read_text(encoding="utf-8")

    if MARKER in src:
        for pat in [r'width\s*:\s*"100%"',r'maxWidth\s*:\s*960',r'alignSelf\s*:\s*"center"',r'paddingBottom\s*:\s*128']:
            if not re.search(pat,src):
                raise SystemExit(f"STOP — {rel} has AV3R marker but incomplete responsive properties.")
        print(f"ALREADY APPLIED — {rel}")
        continue

    m=locate_content(src,rel)
    body=m.group("body")
    require(body,"padding",exp["padding"],rel)
    require(body,"paddingTop",exp["paddingTop"],rel)
    require(body,"paddingBottom",exp["paddingBottom"],rel)

    body2=re.sub(r'(?m)(?:^|,)\s*paddingBottom\s*:\s*\d+\s*(?=,|$)', '', body, count=1)
    body2=body2.strip()
    body2=re.sub(r'^\s*,\s*','',body2)
    body2=re.sub(r'\s*,\s*$','',body2)

    newbody=f' /* {MARKER} */ width: "100%", maxWidth: 960, alignSelf: "center", ' + body2 + ', paddingBottom: 128 '
    out=src[:m.start("body")] + newbody + src[m.end("body"):]

    bak=p.with_suffix(p.suffix+".pc030m20av3r.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    p.write_text(out,encoding="utf-8")
    print(f"UPDATED — {rel}")

print("PC-030M20AV3R applied successfully.")
print("PRESERVED — Existing Portal navigation-only behavior remains unchanged.")
print("PRESERVED — Investor Alert Review navigation to scenario/trade/security detail remains unchanged.")
print("PRESERVED — My Profile account/profile/broker/portfolio navigation and read behavior remain unchanged.")
