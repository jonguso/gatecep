from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
REL="app/manual-portfolio-entry.js"
P=ROOT/REL
MARKER="PC-030M20AV3Z RESPONSIVE CALIBRATION"

if not P.exists():
    raise SystemExit(f"MISSING — {REL}")

src=P.read_text(encoding="utf-8")

required=[
    "savePortfolio",
    "hasConnectedRealBrokerAccount",
    "Your connected REAL broker holdings are read-only here. Use verified broker synchronization.",
    "Add holdings only for initial REAL portfolio setup before connecting a broker.",
    'router.replace("/portfolio-sync-center")',
    'reason: "MANUAL_PORTFOLIO_ENTRY"',
]
for token in required:
    if token not in src:
        raise SystemExit(f"STOP — {REL} required manual-entry integrity contract missing: {token}")

if MARKER in src:
    for pat,label in [
        (r'width\s*:\s*"100%"',"width 100%"),
        (r'maxWidth\s*:\s*960',"maxWidth 960"),
        (r'alignSelf\s*:\s*"center"',"centered containment"),
        (r'paddingBottom\s*:\s*128',"bottom clearance 128"),
    ]:
        if not re.search(pat,src):
            raise SystemExit(f"STOP — {REL} has AV3Z marker but incomplete calibration: {label}")
    print(f"ALREADY APPLIED — {REL}")
else:
    anchor='content: { padding: 22, paddingTop: 70, paddingBottom: 40 },'
    replacement='content: { /* PC-030M20AV3Z RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 },'
    count=src.count(anchor)
    if count != 1:
        raise SystemExit(
            f"STOP — {REL} expected exactly one audited content style anchor; found {count}. "
            "No broad fallback attempted."
        )
    bak=P.with_suffix(P.suffix+".pc030m20av3z.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    P.write_text(src.replace(anchor,replacement,1),encoding="utf-8")
    print(f"UPDATED — {REL}")

print("PC-030M20AV3Z applied successfully.")
print("PRESERVED — manual entry remains initial REAL portfolio setup only before broker connection.")
print("PRESERVED — connected REAL broker holdings remain read-only in manual entry.")
print("PRESERVED — verified broker sync handoff remains /portfolio-sync-center.")
print("PRESERVED — canonical snapshot refresh remains MANUAL_PORTFOLIO_ENTRY.")
