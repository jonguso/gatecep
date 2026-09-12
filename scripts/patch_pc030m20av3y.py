from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
REL="app/link-broker-account.js"
P=ROOT/REL
MARKER="PC-030M20AV3Y RESPONSIVE CALIBRATION"

if not P.exists():
    raise SystemExit(f"MISSING — {REL}")

src=P.read_text(encoding="utf-8")

required=[
    "upsertBrokerAccount",
    'defaultBroker: true',
    'Alert.alert("Broker Linked", "Broker account saved.")',
    'router.replace("/broker-accounts")',
    "Add your broker client number. CDS is user-level and not used as the broker account key.",
]
for token in required:
    if token not in src:
        raise SystemExit(f"STOP — {REL} required broker-link contract missing: {token}")

if MARKER in src:
    for pat,label in [
        (r'width\s*:\s*"100%"',"width 100%"),
        (r'maxWidth\s*:\s*960',"maxWidth 960"),
        (r'alignSelf\s*:\s*"center"',"centered containment"),
        (r'paddingBottom\s*:\s*128',"bottom clearance 128"),
    ]:
        if not re.search(pat,src):
            raise SystemExit(f"STOP — {REL} has AV3Y marker but incomplete calibration: {label}")
    print(f"ALREADY APPLIED — {REL}")
else:
    anchor='content: { padding: 22, paddingTop: 70, paddingBottom: 100 },'
    replacement='content: { /* PC-030M20AV3Y RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 },'
    count=src.count(anchor)
    if count != 1:
        raise SystemExit(
            f"STOP — {REL} expected exactly one audited content style anchor; found {count}. "
            "No broad fallback attempted."
        )
    bak=P.with_suffix(P.suffix+".pc030m20av3y.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    P.write_text(src.replace(anchor,replacement,1),encoding="utf-8")
    print(f"UPDATED — {REL}")

print("PC-030M20AV3Y applied successfully.")
print("PRESERVED — canonical broker account upsert remains unchanged.")
print("PRESERVED — linked account remains defaultBroker=true.")
print("PRESERVED — successful save still returns to /broker-accounts.")
print("PRESERVED — CDS remains user-level and is not used as the broker account key.")
