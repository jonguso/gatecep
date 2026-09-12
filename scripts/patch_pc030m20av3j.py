
from pathlib import Path
import sys

ROOT=Path(sys.argv[1]).resolve()
MARK="PC-030M20AV3J RESPONSIVE CALIBRATION"
targets={
 "calendar":ROOT/"mobile/app/(tabs)/calendar.js",
 "funds":ROOT/"mobile/app/(tabs)/funds.js",
 "news":ROOT/"mobile/app/(tabs)/news.js",
}
for name,p in targets.items():
    if not p.exists():
        raise SystemExit(f"ERROR — missing target {name}: {p}")

def replace_once(s, old, new, label):
    if new in s:
        return s
    if old not in s:
        raise SystemExit(f"ERROR — {label} anchor not found")
    return s.replace(old,new,1)

def mark(s):
    if MARK in s:
        return s
    i=s.find("export default")
    if i < 0:
        raise SystemExit("ERROR — export default anchor not found")
    return s[:i] + "// " + MARK + "\n" + s[i:]

def save(p,b,s):
    s=mark(s)
    if s==b:
        return False
    bak=Path(str(p)+".pc030m20av3j.bak")
    if not bak.exists():
        bak.write_text(b,encoding="utf-8")
    p.write_text(s,encoding="utf-8")
    return True

changed={}

# Calendar: seven-column calendar must remain seven-column. Only contain the
# screen, improve metric flexibility and wrap long header/modal rows.
p=targets["calendar"]; b=p.read_text(encoding="utf-8"); s=b
s=replace_once(
 s,
 'content: { padding: 22, paddingTop: 70, paddingBottom: 120 }',
 'content: { width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 }',
 "Calendar content"
)
s=replace_once(
 s,
 'metric: { width: "47%", backgroundColor:',
 'metric: { width: "47%", flexGrow: 1, minWidth: 140, backgroundColor:',
 "Calendar metric"
)
s=replace_once(
 s,
 'cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }',
 'cardHead: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }',
 "Calendar card header"
)
s=replace_once(
 s,
 'modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }',
 'modalHead: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, paddingBottom: 8 }',
 "Calendar modal header"
)
changed["calendar"]=save(p,b,s)

# Funds: sensitive cash/reconciliation logic is untouched. Layout-only shell.
p=targets["funds"]; b=p.read_text(encoding="utf-8"); s=b
s=replace_once(
 s,
 'content: { padding: 22, paddingTop: 70, paddingBottom: 90 }',
 'content: { width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 }',
 "Funds content"
)
# The discovered headerRow is a layout hotspot; wrap it without changing controls.
s=replace_once(
 s,
 'headerRow: {\n    flexDirection: "row",',
 'headerRow: {\n    flexDirection: "row",\n    flexWrap: "wrap",',
 "Funds header"
)
changed["funds"]=save(p,b,s)

# News: verified-news evidence and portfolio-aware alerts remain untouched.
p=targets["news"]; b=p.read_text(encoding="utf-8"); s=b
s=replace_once(
 s,
 'content: { padding: 22, paddingTop: 70, paddingBottom: 120 }',
 'content: { width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 }',
 "News content"
)
s=replace_once(
 s,
 'metric: { width: "47%", backgroundColor:',
 'metric: { width: "47%", flexGrow: 1, minWidth: 140, backgroundColor:',
 "News metric"
)
s=replace_once(
 s,
 'statusTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }',
 'statusTop: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }',
 "News status header"
)
s=replace_once(
 s,
 'top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }',
 'top: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }',
 "News item header"
)
changed["news"]=save(p,b,s)

print("PC-030M20AV3J — Core Tabs Responsive Residual Calibration")
for k in ("calendar","funds","news"):
    print(("UPDATED" if changed[k] else "NO CHANGE")+f" — {k}")
print("PRESERVED — Calendar remains verified-evidence driven; no placeholder events are introduced.")
print("PRESERVED — Funds REAL broker cash remains read-only outside verified reconciliation/synchronization.")
print("PRESERVED — Funds reconciliation evidence does not directly replace REAL cash before broker snapshot confirmation.")
print("PRESERVED — News remains verified-source driven and does not substitute placeholder news.")
print("PRESERVED — Portfolio-aware news/calendar alert logic and route handoffs remain unchanged.")
print("PC-030M20AV3J applied successfully.")
