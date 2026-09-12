from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
MARKER="PC-030M20AV3S RESPONSIVE CALIBRATION"

targets = {
    "app/dna-update-review.js": {
        "padding": 18,
        "paddingBottom": 40,
        "required_tokens": [
            "confirmInvestorDNAReviewField",
            "submitInvestorDNAReviewConfirmation",
        ],
    },
    "app/portfolio-simulator.js": {
        "padding": 22,
        "paddingTop": 70,
        "paddingBottom": 100,
        "required_tokens": [
            "saveScenario",
            "setSelectedScenario",
        ],
    },
}

def brace_objects(src):
    for m in re.finditer(r'\bcontent\s*:\s*\{', src):
        open_idx=src.find("{",m.start())
        depth=0
        in_s=in_d=in_t=False
        esc=False
        for i in range(open_idx,len(src)):
            ch=src[i]
            if esc:
                esc=False
                continue
            if ch=="\\":
                esc=True
                continue
            if in_s:
                if ch=="'": in_s=False
                continue
            if in_d:
                if ch=='"': in_d=False
                continue
            if in_t:
                if ch=="`": in_t=False
                continue
            if ch=="'": in_s=True
            elif ch=='"': in_d=True
            elif ch=="`": in_t=True
            elif ch=="{": depth+=1
            elif ch=="}":
                depth-=1
                if depth==0:
                    yield (open_idx,i,src[open_idx+1:i])
                    break

def has_num(body,prop,val):
    return re.search(rf'\b{re.escape(prop)}\s*:\s*{val}\b',body) is not None

for rel,cfg in targets.items():
    p=ROOT/rel
    if not p.exists():
        raise SystemExit(f"MISSING — {rel}")
    src=p.read_text(encoding="utf-8")

    for tok in cfg["required_tokens"]:
        if tok not in src:
            raise SystemExit(f"STOP — {rel} required workflow token missing before patch: {tok}")

    if MARKER in src:
        if not all(re.search(x,src) for x in [
            r'width\s*:\s*"100%"',
            r'maxWidth\s*:\s*960',
            r'alignSelf\s*:\s*"center"',
            r'paddingBottom\s*:\s*128',
        ]):
            raise SystemExit(f"STOP — {rel} has AV3S marker but incomplete calibration.")
        print(f"ALREADY APPLIED — {rel}")
        continue

    matches=[]
    for open_idx,close_idx,body in brace_objects(src):
        if not has_num(body,"padding",cfg["padding"]): continue
        if not has_num(body,"paddingBottom",cfg["paddingBottom"]): continue
        if "paddingTop" in cfg and not has_num(body,"paddingTop",cfg["paddingTop"]): continue
        matches.append((open_idx,close_idx,body))

    if len(matches)!=1:
        raise SystemExit(f"STOP — {rel} expected exactly one matching content style; found {len(matches)}.")

    open_idx,close_idx,body=matches[0]

    # Preserve original object syntax. Only:
    # 1) replace the exact existing paddingBottom numeric value;
    # 2) insert responsive properties directly after the opening brace.
    body2,n=re.subn(
        rf'(\bpaddingBottom\s*:\s*){cfg["paddingBottom"]}\b',
        r'\g<1>128',
        body,
        count=1,
    )
    if n != 1:
        raise SystemExit(f"STOP — {rel} paddingBottom replacement count was {n}.")

    prefix=f' /* {MARKER} */ width: "100%", maxWidth: 960, alignSelf: "center",'
    newbody=prefix + body2
    out=src[:open_idx+1]+newbody+src[close_idx:]

    bak=p.with_suffix(p.suffix+".pc030m20av3s.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    p.write_text(out,encoding="utf-8")
    print(f"UPDATED — {rel}")

print("PC-030M20AV3S applied successfully.")
print("PRESERVED — DNA review confirmation/submission workflow remains unchanged.")
print("PRESERVED — Portfolio Simulator scenario state/persistence workflow remains unchanged.")
print("PRESERVED — no routes, services, financial calculations, or portfolio mutation contracts are modified.")
