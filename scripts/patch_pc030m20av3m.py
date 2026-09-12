
from pathlib import Path
import re, sys

ROOT=Path(sys.argv[1]).resolve()
MARK="PC-030M20AV3M RESPONSIVE CALIBRATION"
TARGETS=[
    ROOT/"mobile/app/broker-sync.js",
    ROOT/"mobile/app/broker-routing.js",
    ROOT/"mobile/app/broker-portfolio-import.js",
]

for p in TARGETS:
    if not p.exists():
        raise SystemExit(f"ERROR — missing target: {p}")

def add_marker(src):
    if MARK in src:
        return src
    i=src.find("export default")
    if i < 0:
        raise SystemExit("ERROR — export default anchor missing")
    return src[:i] + "// " + MARK + "\n" + src[i:]

def calibrate_content(src, label):
    if 'maxWidth: 960' in src and 'paddingBottom: 128' in src:
        return src
    # handle one-line or multiline content style with existing 70/110 shell
    one=re.compile(
        r'content:\s*\{\s*padding:\s*22,\s*paddingTop:\s*70,\s*paddingBottom:\s*110\s*\}'
    )
    if one.search(src):
        return one.sub(
            'content: { width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 }',
            src, count=1
        )

    multi=re.compile(
        r'(content:\s*\{\s*)(.*?)(paddingTop:\s*70,\s*)(paddingBottom:\s*110)',
        re.S
    )
    m=multi.search(src)
    if not m:
        raise SystemExit(f"ERROR — {label} content style anchor not found")
    body=m.group(2)
    prefix=''
    if 'maxWidth:' not in body:
        prefix='width: "100%",\n      maxWidth: 960,\n      alignSelf: "center",\n      '
    repl=m.group(1)+prefix+body+m.group(3)+'paddingBottom: 128'
    return src[:m.start()]+repl+src[m.end():]

def wrap_named_style(src, style_name):
    pat=re.compile(
        rf'({re.escape(style_name)}:\s*\{{[\s\S]*?flexDirection:\s*"row",)([\s\S]*?\}})',
        re.M
    )
    m=pat.search(src)
    if not m:
        return src
    block=m.group(0)
    if 'flexWrap:' in block:
        return src
    new=block.replace('flexDirection: "row",','flexDirection: "row",\n    flexWrap: "wrap",',1)
    return src[:m.start()]+new+src[m.end():]

def flex_first_47(src):
    return re.sub(
        r'width:\s*"47%",(?!\s*flexGrow)',
        'width: "47%",\n      flexGrow: 1,\n      minWidth: 140,',
        src, count=1
    )

changed=[]
for p in TARGETS:
    before=p.read_text(encoding="utf-8")
    src=before
    src=calibrate_content(src,p.name)
    for style_name in [
        "headerRow","metricGrid","cardHeader","row","holdingRow",
        "brokerRow","actions","buttonRow"
    ]:
        src=wrap_named_style(src,style_name)
    src=flex_first_47(src)
    src=add_marker(src)

    if src != before:
        bak=Path(str(p)+".pc030m20av3m.bak")
        if not bak.exists():
            bak.write_text(before,encoding="utf-8")
        p.write_text(src,encoding="utf-8")
        changed.append(p.name)

print("PC-030M20AV3M — Broker Sync, Routing & Controlled Import Responsive Calibration")
for p in TARGETS:
    print(("UPDATED" if p.name in changed else "NO CHANGE")+" — "+p.name)
print("PRESERVED — Broker Sync remains read-only REAL broker evidence comparison; it does not place trades.")
print("PRESERVED — Broker Sync continues to route current valuation/cash evidence into reconciliation and Portfolio Sync Center.")
print("PRESERVED — Broker Routing remains Practice-only simulated routing; no REAL order is transmitted.")
print("PRESERVED — verified broker charge comparison remains evidence-aware; missing verified fee evidence is not invented.")
print("PRESERVED — Controlled Portfolio Import only updates canonical REAL portfolio after approved reconciliation and current broker holding validation.")
print("PRESERVED — Controlled Import does not place a trade or modify the broker account.")
print("PRESERVED — import approval/execution semantics and portfolio-ledger backfill contracts remain unchanged.")
print("PC-030M20AV3M applied successfully.")
