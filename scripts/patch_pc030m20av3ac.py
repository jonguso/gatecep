from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
REL="app/transaction-import.js"
P=ROOT/REL
MARKER="PC-030M20AV3AC RESPONSIVE CALIBRATION"

if not P.exists():
    raise SystemExit(f"MISSING — {REL}")
src=P.read_text(encoding="utf-8")

required=[
    "requireSafeImportFile",
    "requireSafeImportRows",
    "partitionBrokerExecutionEvidence",
    "rebuildCanonicalPortfolioLedger",
    'await userSetItem("transactionHistory", JSON.stringify(verified));',
    'await userSetItem("unverifiedTransactionHistory", JSON.stringify(unverified));',
    'await userSetItem("transactionsUploaded", verified.length ? "true" : "false");',
    '"Evidence Reviewed"',
    "Manual entries cannot become REAL execution evidence. Use a broker file containing the required evidence fields.",
    "REAL activity requires broker date, reference, broker identity, executed quantity and price, fees, and settlement evidence. Manual or incomplete rows remain UNVERIFIED.",
    'router.replace("/portfolio-sync-center")',
]
for token in required:
    if token not in src:
        raise SystemExit(f"STOP — {REL} required broker-execution-evidence contract missing: {token}")

if MARKER in src:
    for pat,label in [
        (r'width\s*:\s*"100%"',"width 100%"),
        (r'maxWidth\s*:\s*960',"maxWidth 960"),
        (r'alignSelf\s*:\s*"center"',"centered containment"),
        (r'paddingBottom\s*:\s*128',"bottom clearance 128"),
    ]:
        if not re.search(pat,src):
            raise SystemExit(f"STOP — {REL} has AV3AC marker but incomplete calibration: {label}")
    print(f"ALREADY APPLIED — {REL}")
else:
    anchor='content: { padding: 22, paddingTop: 70, paddingBottom: 100 },'
    replacement='content: { /* PC-030M20AV3AC RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 },'
    count=src.count(anchor)
    if count != 1:
        raise SystemExit(
            f"STOP — {REL} expected exactly one audited content style anchor; found {count}. "
            "No broad fallback attempted."
        )
    bak=P.with_suffix(P.suffix+".pc030m20av3ac.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    P.write_text(src.replace(anchor,replacement,1),encoding="utf-8")
    print(f"UPDATED — {REL}")

print("PC-030M20AV3AC applied successfully.")
print("PRESERVED — only partitioned verified executions enter canonical transactionHistory.")
print("PRESERVED — incomplete/manual records remain in unverifiedTransactionHistory.")
print("PRESERVED — transactionsUploaded is true only when verified execution evidence exists.")
print("PRESERVED — canonical portfolio ledger rebuild remains after evidence partitioning.")
print("PRESERVED — completion still returns to /portfolio-sync-center.")
