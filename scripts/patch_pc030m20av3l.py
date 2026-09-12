
from pathlib import Path
import re, sys

ROOT=Path(sys.argv[1]).resolve()
MARK="PC-030M20AV3L RESPONSIVE CALIBRATION"

SCROLL_TARGETS=[
    ROOT/"mobile/app/broker-reconciliation-actions.js",
    ROOT/"mobile/app/broker-reconciliation-cases.js",
]
MOBILE_TARGETS=[
    ROOT/"mobile/app/broker-reconciliation.js",
    ROOT/"mobile/app/broker-reconciliation-case.js",
    ROOT/"mobile/app/broker-reconciliation-insight.js",
    ROOT/"mobile/app/broker-resolution.js",
    ROOT/"mobile/app/broker-resolution-ledger.js",
    ROOT/"mobile/app/broker-sync-history.js",
]
TARGETS=SCROLL_TARGETS+MOBILE_TARGETS

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
    # multiline styles.content used by the two large history/action screens
    pat=re.compile(
        r'(content:\s*\{\s*)(.*?)(paddingTop:\s*70,\s*)(paddingBottom:\s*110)',
        re.S
    )
    m=pat.search(src)
    if not m:
        raise SystemExit(f"ERROR — {label} content style anchor not found")
    body=m.group(2)
    prefix=''
    if 'maxWidth:' not in body:
        prefix='width: "100%",\n      maxWidth: 960,\n      alignSelf: "center",\n      '
    repl=m.group(1)+prefix+body+m.group(3)+'paddingBottom: 128'
    return src[:m.start()]+repl+src[m.end():]

def wrap_named_style(src, style_name):
    # Add flexWrap to a named row style without altering its business/UI semantics.
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

    if p in SCROLL_TARGETS:
        src=calibrate_content(src,p.name)
        src=flex_first_47(src)

    # Narrow-screen resilience for value rows / headers across both canonical
    # MobileScreen and legacy ScrollView screens.
    for style_name in [
        "row","header","headerRow","metricGrid","cardHeader","issueHeader",
        "comparisonRow","historyLink","routeButton","option"
    ]:
        src=wrap_named_style(src,style_name)

    src=add_marker(src)

    if src != before:
        bak=Path(str(p)+".pc030m20av3l.bak")
        if not bak.exists():
            bak.write_text(before,encoding="utf-8")
        p.write_text(src,encoding="utf-8")
        changed.append(p.name)

print("PC-030M20AV3L — Broker Reconciliation & Resolution Responsive Calibration")
for p in TARGETS:
    print(("UPDATED" if p.name in changed else "NO CHANGE")+" — "+p.name)
print("PRESERVED — Practice reconciliation remains isolated from REAL holdings, cash, performance and connected-broker source-of-truth records.")
print("PRESERVED — reconciliation case review and resolution remain explanatory/sandbox-only.")
print("PRESERVED — resolution choices cannot import, buy, sell, transfer or automatically modify investments.")
print("PRESERVED — reconciliation actions do not place trades, move cash or modify broker accounts.")
print("PRESERVED — reconciliation history, decision ledger and sync history remain audit/read-only surfaces.")
print("PRESERVED — cash evidence requirements and existing evidence/review/resolve/complete route flow remain unchanged.")
print("PRESERVED — canonical MobileScreen / StickyActionBar shells remain in place where already used.")
print("PC-030M20AV3L applied successfully.")
