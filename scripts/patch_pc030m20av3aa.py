from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
REL="app/import-portfolio.js"
P=ROOT/REL
MARKER="PC-030M20AV3AA RESPONSIVE CALIBRATION"

if not P.exists():
    raise SystemExit(f"MISSING — {REL}")
src=P.read_text(encoding="utf-8")

required=[
    "requireSafeImportFile",
    "requireSafeImportRows",
    "loadVerifiedUserCds",
    "requireValidBrokerEvidenceIdentity",
    "hasConnectedRealBrokerAccount",
    '"BROKER_RECONCILIATION_EVIDENCE"',
    '"INITIAL_REAL_PORTFOLIO"',
    'pathname: "/review-portfolio-import"',
    'mode: reconciliationMode ? "RECONCILE" : "INITIAL"',
]
for token in required:
    if token not in src:
        raise SystemExit(f"STOP — {REL} required import/evidence contract missing: {token}")

if MARKER in src:
    checks=[
        (r'width\s*:\s*"100%"',"width 100%"),
        (r'maxWidth\s*:\s*960',"maxWidth 960"),
        (r'alignSelf\s*:\s*"center"',"centered containment"),
        (r'paddingBottom\s*:\s*128',"bottom clearance 128"),
    ]
    for pat,label in checks:
        if not re.search(pat,src):
            raise SystemExit(f"STOP — {REL} has AV3AA marker but incomplete calibration: {label}")
    print(f"ALREADY APPLIED — {REL}")
else:
    anchor='content: { padding: 22, paddingTop: 70, paddingBottom: 100 },'
    replacement='content: { /* PC-030M20AV3AA RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 },'
    count=src.count(anchor)
    if count != 1:
        raise SystemExit(f"STOP — {REL} expected exactly one audited content style anchor; found {count}. No broad fallback attempted.")
    bak=P.with_suffix(P.suffix+".pc030m20av3aa.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    P.write_text(src.replace(anchor,replacement,1),encoding="utf-8")
    print(f"UPDATED — {REL}")

print("PC-030M20AV3AA applied successfully.")
print("PRESERVED — safe import file/row validation remains unchanged.")
print("PRESERVED — verified CDS and broker evidence identity checks remain unchanged.")
print("PRESERVED — reconciliation evidence remains distinct from initial REAL portfolio import.")
print("PRESERVED — import continues to /review-portfolio-import for explicit review.")
