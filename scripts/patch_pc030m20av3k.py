
from pathlib import Path
import re, sys

ROOT=Path(sys.argv[1]).resolve()
MARK="PC-030M20AV3K RESPONSIVE CALIBRATION"

TARGETS=[
    ROOT/"mobile/app/broker-account-center.js",
    ROOT/"mobile/app/broker-accounts.js",
    ROOT/"mobile/app/broker-profile.js",
    ROOT/"mobile/app/broker-status.js",
    ROOT/"mobile/app/broker-upload.js",
    ROOT/"mobile/app/brokers.js",
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

def replace_content_style(src, label):
    # Handles one-line and multiline content style declarations with existing
    # padding / paddingTop / paddingBottom. Keeps all unrelated layout intact.
    if 'maxWidth: 960' in src and 'paddingBottom: 128' in src:
        return src

    # One-line form.
    one=re.compile(
        r'content:\s*\{\s*padding:\s*22,\s*paddingTop:\s*70,\s*paddingBottom:\s*(?:60|80|90|100|110)\s*\}'
    )
    if one.search(src):
        return one.sub(
            'content: { width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 }',
            src, count=1
        )

    # Multiline form.
    multi=re.compile(
        r'(content:\s*\{\s*)(.*?)(paddingTop:\s*70,\s*)(paddingBottom:\s*(?:60|80|90|100|110))',
        re.S
    )
    m=multi.search(src)
    if not m:
        raise SystemExit(f"ERROR — {label} content style anchor not found")
    body=m.group(2)
    prefix=''
    if 'width:' not in body and 'maxWidth:' not in body:
        prefix='width: "100%",\n    maxWidth: 960,\n    alignSelf: "center",\n    '
    repl=m.group(1)+prefix+body+m.group(3)+'paddingBottom: 128'
    return src[:m.start()]+repl+src[m.end():]

def wrap_named_style(src, style_name):
    # Adds flexWrap only to a named style block that already declares row.
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

def flex_metric(src):
    # Existing 47% cards remain two-column where space permits but may grow and
    # have a sane minimum on narrower desktop/tablet widths.
    if 'width: "47%"' not in src:
        return src
    # Only patch first metric-style width if flexGrow/minWidth not immediately present.
    return re.sub(
        r'width:\s*"47%",(?!\s*flexGrow)',
        'width: "47%",\n    flexGrow: 1,\n    minWidth: 140,',
        src,
        count=1
    )

changed=[]
for p in TARGETS:
    before=p.read_text(encoding="utf-8")
    src=before
    src=replace_content_style(src,p.name)
    src=wrap_named_style(src,"headerRow")
    src=wrap_named_style(src,"panelTabs")
    if p.name=="broker-accounts.js":
        src=flex_metric(src)
    src=add_marker(src)

    if src != before:
        bak=Path(str(p)+".pc030m20av3k.bak")
        if not bak.exists():
            bak.write_text(before,encoding="utf-8")
        p.write_text(src,encoding="utf-8")
        changed.append(p.name)

print("PC-030M20AV3K — Broker Account Responsive Residual Calibration")
for p in TARGETS:
    print(("UPDATED" if p.name in changed else "NO CHANGE")+" — "+p.name)
print("PRESERVED — Broker Account Center remains demo/POC profile linking; no live broker API behavior added.")
print("PRESERVED — canonical Broker Accounts remains the source for linked accounts, defaults and verified fee schedules.")
print("PRESERVED — disconnecting a canonical broker account does not delete portfolio history.")
print("PRESERVED — broker fee schedules are only verified when evidence source/date/confirmation requirements are satisfied.")
print("PRESERVED — Broker Profile remains the compatibility statement-matching profile and converges into canonical accounts.")
print("PRESERVED — Broker Status remains Practice-only readiness, separate from REAL broker synchronization.")
print("PRESERVED — Broker Upload keeps valuation, cash/ledger and transaction-history evidence routes unchanged.")
print("PRESERVED — legacy /brokers upload guidance remains navigation-only; no reconciliation or portfolio mutation logic added.")
print("PC-030M20AV3K applied successfully.")
