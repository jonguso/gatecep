from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
REL="app/review-portfolio-import.js"
P=ROOT/REL
MARKER="PC-030M20AV3AB RESPONSIVE CALIBRATION"

if not P.exists():
    raise SystemExit(f"MISSING — {REL}")
src=P.read_text(encoding="utf-8")

required=[
    "saveVerifiedUploadedBrokerMirror",
    "hasConnectedRealBrokerAccount",
    '"BROKER_RECONCILIATION_EVIDENCE"',
    '"Broker Evidence Ready"',
    '"The verified valuation is ready. Add the matching cash statement, then confirm the broker snapshot. No REAL holdings were changed yet."',
    '"Connected Broker Holdings Are Read-only"',
    '"This ordinary import cannot replace connected REAL holdings. Upload it as verified broker evidence from Portfolio Sync Center."',
    "await savePortfolio(cleanPortfolio);",
    'reason: "CONFIRMED_PORTFOLIO_IMPORT"',
    'router.replace("/portfolio-sync-center")',
    '"Confirm Broker Evidence and Compare"',
    '"Confirm Initial REAL Portfolio"',
]
for token in required:
    if token not in src:
        raise SystemExit(f"STOP — {REL} required review/import integrity contract missing: {token}")

if MARKER in src:
    for pat,label in [
        (r'width\s*:\s*"100%"',"width 100%"),
        (r'maxWidth\s*:\s*960',"maxWidth 960"),
        (r'alignSelf\s*:\s*"center"',"centered containment"),
        (r'paddingBottom\s*:\s*128',"bottom clearance 128"),
    ]:
        if not re.search(pat,src):
            raise SystemExit(f"STOP — {REL} has AV3AB marker but incomplete calibration: {label}")
    print(f"ALREADY APPLIED — {REL}")
else:
    anchor='content: { padding: 22, paddingTop: 70, paddingBottom: 40 },'
    replacement='content: { /* PC-030M20AV3AB RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 },'
    count=src.count(anchor)
    if count != 1:
        raise SystemExit(
            f"STOP — {REL} expected exactly one audited content style anchor; found {count}. "
            "No broad fallback attempted."
        )
    bak=P.with_suffix(P.suffix+".pc030m20av3ab.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    P.write_text(src.replace(anchor,replacement,1),encoding="utf-8")
    print(f"UPDATED — {REL}")

print("PC-030M20AV3AB applied successfully.")
print("PRESERVED — RECONCILE confirmation writes verified broker mirror evidence only.")
print("PRESERVED — RECONCILE confirmation does not replace REAL holdings.")
print("PRESERVED — connected REAL broker holdings remain read-only to ordinary import.")
print("PRESERVED — initial import savePortfolio path remains separate and retains CONFIRMED_PORTFOLIO_IMPORT snapshot trigger.")
