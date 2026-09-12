from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
MARKER="PC-030M20AV3R RESPONSIVE CALIBRATION"

targets = {
    "app/existing-portal.js": {"padding":22,"paddingTop":70,"paddingBottom":40},
    "app/investor-alert-review.js": {"padding":20,"paddingTop":54,"paddingBottom":120},
    "app/my-profile.js": {"padding":22,"paddingTop":70,"paddingBottom":100},
}

def find_content_object(src, rel):
    # Find a `content:` style key anywhere, then brace-match its object.
    # This tolerates indentation, multiline formatting, comments, and nested
    # values better than AV3R's original simple regex.
    matches=list(re.finditer(r'\bcontent\s*:\s*\{', src))
    if not matches:
        raise SystemExit(f"STOP — no `content: {{...}}` style key found in {rel}.")

    # Prefer the candidate containing the AV3O-discovered padding properties.
    candidates=[]
    for m in matches:
        open_idx=src.find("{", m.start())
        depth=0
        in_s=in_d=in_t=False
        esc=False
        close_idx=None
        i=open_idx
        while i < len(src):
            ch=src[i]
            if esc:
                esc=False
                i+=1
                continue
            if ch=="\\":
                esc=True
                i+=1
                continue
            if in_s:
                if ch=="'": in_s=False
                i+=1
                continue
            if in_d:
                if ch=='"': in_d=False
                i+=1
                continue
            if in_t:
                if ch=="`": in_t=False
                i+=1
                continue
            if ch=="'": in_s=True
            elif ch=='"': in_d=True
            elif ch=="`": in_t=True
            elif ch=="{": depth+=1
            elif ch=="}":
                depth-=1
                if depth==0:
                    close_idx=i
                    break
            i+=1
        if close_idx is None:
            continue
        body=src[open_idx+1:close_idx]
        candidates.append((m.start(),open_idx,close_idx,body))

    if not candidates:
        raise SystemExit(f"STOP — could not brace-match a content style object in {rel}.")
    return candidates

def has_prop(body, prop, val):
    return re.search(rf'\b{re.escape(prop)}\s*:\s*{val}\b', body) is not None

def choose_candidate(src, rel, exp):
    candidates=find_content_object(src, rel)
    matching=[]
    for c in candidates:
        body=c[3]
        if all(has_prop(body,p,v) for p,v in exp.items()):
            matching.append(c)
    if len(matching)!=1:
        raise SystemExit(
            f"STOP — {rel} expected exactly one content object with "
            f"padding={exp['padding']}, paddingTop={exp['paddingTop']}, "
            f"paddingBottom={exp['paddingBottom']}; found {len(matching)}."
        )
    return matching[0]

def remove_numeric_prop(body, prop):
    # Remove one ordinary numeric property while preserving the rest of the object.
    patterns=[
        rf'(?m)(^|,)\s*{re.escape(prop)}\s*:\s*\d+\s*(?=,|$)',
    ]
    out=body
    for pat in patterns:
        out2,n=re.subn(pat, lambda m: m.group(1) if m.group(1)=="," else "", out, count=1)
        if n:
            out=out2
            break
    return out

for rel, exp in targets.items():
    p=ROOT/rel
    if not p.exists():
        raise SystemExit(f"MISSING — {rel}")
    src=p.read_text(encoding="utf-8")

    # Partial-apply recovery: validate existing AV3R patch and continue.
    if MARKER in src:
        required=[
            r'width\s*:\s*"100%"',
            r'maxWidth\s*:\s*960',
            r'alignSelf\s*:\s*"center"',
            r'paddingBottom\s*:\s*128',
        ]
        if not all(re.search(x,src) for x in required):
            raise SystemExit(f"STOP — {rel} has AV3R marker but incomplete responsive properties.")
        print(f"VALIDATED ALREADY APPLIED — {rel}")
        continue

    _,open_idx,close_idx,body=choose_candidate(src,rel,exp)

    body2=remove_numeric_prop(body,"paddingBottom").strip()
    body2=re.sub(r'^\s*,\s*','',body2)
    body2=re.sub(r'\s*,\s*$','',body2)

    newbody=(
        f' /* {MARKER} */ width: "100%", maxWidth: 960, '
        f'alignSelf: "center", ' + body2 + ', paddingBottom: 128 '
    )
    out=src[:open_idx+1]+newbody+src[close_idx:]

    bak=p.with_suffix(p.suffix+".pc030m20av3r1.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    p.write_text(out,encoding="utf-8")
    print(f"UPDATED — {rel}")

print("PC-030M20AV3R1 recovery applied successfully.")
print("PRESERVED — only the selected content style object is modified.")
print("PRESERVED — routes, services, profile data, broker/cash/portfolio reads, and alert handoffs are unchanged.")
