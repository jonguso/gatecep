from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
MARKER="PC-030M20AV3V RESPONSIVE CALIBRATION"

def validate_responsive(src, rel):
    checks = [
        (r'width\s*:\s*"100%"', "width 100%"),
        (r'maxWidth\s*:\s*960', "maxWidth 960"),
        (r'alignSelf\s*:\s*"center"', "centered containment"),
        (r'paddingBottom\s*:\s*128', "bottom clearance 128"),
    ]
    if MARKER not in src:
        return False
    for pat,label in checks:
        if not re.search(pat, src):
            raise SystemExit(f"STOP — {rel} has AV3V marker but incomplete calibration: {label}")
    return True

already = [
    "app/execution-audit.js",
    "app/execution-bridge.js",
]

for rel in already:
    p=ROOT/rel
    if not p.exists():
        raise SystemExit(f"MISSING — {rel}")
    src=p.read_text(encoding="utf-8")
    if not validate_responsive(src, rel):
        raise SystemExit(f"STOP — {rel} expected already-applied AV3V marker is missing.")
    print(f"VALIDATED ALREADY APPLIED — {rel}")

rel="app/execution-wizard.js"
p=ROOT/rel
if not p.exists():
    raise SystemExit(f"MISSING — {rel}")
src=p.read_text(encoding="utf-8")

for tok in [
    "calculateExecutionReadiness",
    "Practice-only path from a Coach G idea to simulated order review. REAL execution occurs only at the broker.",
    "Broker account not linked",
    "Trade basket not created",
    "Cash balance missing",
    "Portfolio not loaded",
    "/broker-marketplace",
]:
    if tok not in src:
        raise SystemExit(f"STOP — {rel} required execution-boundary token missing before patch: {tok}")

if validate_responsive(src, rel):
    print(f"ALREADY APPLIED — {rel}")
else:
    # Current audited source uses compact StyleSheet syntax.
    anchor='content:{padding:22,paddingTop:70,paddingBottom:120}'
    replacement='content:{/* PC-030M20AV3V RESPONSIVE CALIBRATION */width:"100%",maxWidth:960,alignSelf:"center",padding:22,paddingTop:70,paddingBottom:128}'
    count=src.count(anchor)
    if count != 1:
        raise SystemExit(
            f"STOP — {rel} expected exactly one compact content style anchor; found {count}. "
            "No broad fallback patch attempted."
        )
    bak=p.with_suffix(p.suffix+".pc030m20av3v2.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    out=src.replace(anchor,replacement,1)
    p.write_text(out,encoding="utf-8")
    print(f"UPDATED — {rel}")

print("PC-030M20AV3V2 recovery applied successfully.")
print("PRESERVED — Execution Audit and Execution Bridge were validated with formatting-tolerant checks and not rewritten.")
print("PRESERVED — Execution Wizard remains Practice readiness/review only; REAL execution occurs only at the broker.")
