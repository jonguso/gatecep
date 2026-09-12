from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
p=ROOT/"app/queue-manager.js"
MARKER="PC-030M20AV3T RESPONSIVE CALIBRATION"

src=p.read_text(encoding="utf-8")

required_before = [
    'Practice Queue Manager',
    'Practice-only lifecycle simulator. It does not call broker adapters or create REAL execution evidence.',
    'GATECEP_PRACTICE',
    'PRACTICE_SIMULATION',
    'fillBrokerReceivedOrders',
    'basketExecutionStore',
    '/trade-basket',
]
for token in required_before:
    if token not in src:
        raise SystemExit(f"STOP — app/queue-manager.js required Practice contract token missing before patch: {token}")

if MARKER in src:
    for pat in [
        r'width\s*:\s*"100%"',
        r'maxWidth\s*:\s*960',
        r'alignSelf\s*:\s*"center"',
        r'paddingBottom\s*:\s*128',
    ]:
        if not re.search(pat,src):
            raise SystemExit("STOP — AV3T marker present but responsive calibration is incomplete.")
    print("ALREADY APPLIED — app/queue-manager.js")
else:
    # Exact known AV3O style anchor. Replace in place; do not rebuild the style object.
    anchor='content: { padding: 22, paddingTop: 70, paddingBottom: 110 }'
    if anchor not in src:
        raise SystemExit(
            "STOP — expected queue-manager content style anchor not found; "
            "no broad fallback patch attempted."
        )
    replacement=(
        'content: { /* PC-030M20AV3T RESPONSIVE CALIBRATION */ '
        'width: "100%", maxWidth: 960, alignSelf: "center", '
        'padding: 22, paddingTop: 70, paddingBottom: 128 }'
    )
    bak=p.with_suffix(p.suffix+".pc030m20av3t.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    p.write_text(src.replace(anchor,replacement,1),encoding="utf-8")
    print("UPDATED — app/queue-manager.js")

print("PC-030M20AV3T applied successfully.")
print("PRESERVED — Queue Manager remains Practice-only lifecycle simulation.")
print("PRESERVED — no REAL broker transmission or REAL execution evidence is created.")
print("PRESERVED — existing Practice order lifecycle mutations remain unchanged.")
