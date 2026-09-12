from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
REL="app/reconciliation-conversation.js"
P=ROOT/REL
MARKER="PC-030M20AV3X RESPONSIVE CALIBRATION"

if not P.exists():
    raise SystemExit(f"MISSING — {REL}")

src=P.read_text(encoding="utf-8")

required=[
    "Coach G",
    "confirmed clarification evidence",
    "Your Investor DNA was not changed automatically.",
    "A single response does not automatically rewrite your Investor DNA, place trades, or change your portfolio.",
]
for token in required:
    if token not in src:
        raise SystemExit(f"STOP — {REL} required reconciliation-evidence contract missing: {token}")

if MARKER in src:
    for pat,label in [
        (r'width\s*:\s*"100%"',"width 100%"),
        (r'maxWidth\s*:\s*960',"maxWidth 960"),
        (r'alignSelf\s*:\s*"center"',"centered containment"),
        (r'paddingBottom\s*:\s*128',"bottom clearance 128"),
    ]:
        if not re.search(pat,src):
            raise SystemExit(f"STOP — {REL} has AV3X marker but incomplete calibration: {label}")
    print(f"ALREADY APPLIED — {REL}")
else:
    # Locate only the StyleSheet `content` object used by contentContainerStyle.
    # Accept multiline or compact formatting, but do not touch any other style object.
    m=re.search(r'(\bcontent\s*:\s*\{)(.*?)(\}\s*,?\s*\n)',src,re.S)
    if not m:
        raise SystemExit(f"STOP — {REL} content style object not found. No broad fallback attempted.")
    body=m.group(2)

    # The audited current screen has paddingBottom 40. Require that known baseline.
    if not re.search(r'paddingBottom\s*:\s*40\b',body):
        raise SystemExit(f"STOP — {REL} expected audited paddingBottom 40 baseline not found. No broad fallback attempted.")

    # Avoid silently overriding an existing desktop containment contract.
    if re.search(r'\bmaxWidth\s*:',body) or re.search(r'\balignSelf\s*:',body):
        raise SystemExit(f"STOP — {REL} already has containment properties not covered by AV3X.")

    new_body=body
    new_body=re.sub(r'paddingBottom\s*:\s*40\b','paddingBottom: 128',new_body,count=1)

    # Insert calibrated containment at the start of the content style body.
    prefix='\n    /* PC-030M20AV3X RESPONSIVE CALIBRATION */\n    width: "100%",\n    maxWidth: 960,\n    alignSelf: "center",'
    new_body=prefix+new_body

    out=src[:m.start(2)]+new_body+src[m.end(2):]
    bak=P.with_suffix(P.suffix+".pc030m20av3x.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    P.write_text(out,encoding="utf-8")
    print(f"UPDATED — {REL}")

print("PC-030M20AV3X applied successfully.")
print("PRESERVED — Coach G reconciliation clarification remains evidence-only.")
print("PRESERVED — Investor DNA is not changed automatically.")
print("PRESERVED — a clarification response does not place trades or change the portfolio.")
