
from pathlib import Path
import re, sys
ROOT=Path(sys.argv[1]).resolve()
MARK="PC-030M20AV3G RESPONSIVE CALIBRATION"
P={
 "fundamental_import":ROOT/"mobile/app/fundamental-import.js",
 "operations":ROOT/"mobile/app/fundamental-operations-center.js",
 "extraction":ROOT/"mobile/app/filing-extraction.js",
 "bridge":ROOT/"mobile/app/filing-import-bridge.js",
 "history":ROOT/"mobile/app/filing-submission-history.js",
}
for n,p in P.items():
    if not p.exists(): raise SystemExit(f"ERROR — missing {n}: {p}")

def rep(s,a,b,label,count=1):
    if b in s:return s
    if a not in s:raise SystemExit(f"ERROR — {label} anchor not found")
    return s.replace(a,b,count)

def add_rn(s,name):
    m=re.search(r'import\s*\{([\s\S]*?)\}\s*from\s*"react-native";',s)
    if not m: raise SystemExit("ERROR — react-native import anchor missing")
    if re.search(rf'\b{re.escape(name)}\b',m.group(0)): return s
    body=m.group(1).rstrip()
    if body and not body.endswith(","): body+=","
    body+="\n  "+name
    return s[:m.start()]+"import {"+body+'\n} from "react-native";'+s[m.end():]

def mark(s):
    if MARK in s:return s
    i=s.find("export default")
    if i<0:raise SystemExit("ERROR — export default anchor missing")
    return s[:i]+"// "+MARK+"\n"+s[i:]

def save(p,b,s):
    s=mark(s)
    if s==b:return False
    bak=Path(str(p)+".pc030m20av3g.bak")
    if not bak.exists():bak.write_text(b,encoding="utf-8")
    p.write_text(s,encoding="utf-8");return True

def add_hook(s,fn):
    return rep(s,f"export default function {fn}() {{\n",
               f"export default function {fn}() {{\n  const {{ width: windowWidth }} = useWindowDimensions();\n",
               f"{fn} width hook")

def root_content(s,label):
    return rep(s,'''contentContainerStyle={
        styles.content
      }''','''contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}''',label+" content")

def title(s,label):
    return rep(s,'''style={
          styles.title
        }''','''style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}''',label+" title")

changed={}

# Fundamental Import
p=P["fundamental_import"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=add_hook(s,"FundamentalImportScreen")
s=root_content(s,"Fundamental Import")
s=title(s,"Fundamental Import")
s=rep(s,'''<View
        style={
          styles.hero
        }
      >''','''<View
        style={[
          styles.hero,
          windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
        ]}
      >''',"Fundamental Import hero")
changed["fundamental_import"]=save(p,b,s)

# Operations Center
p=P["operations"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=add_hook(s,"FundamentalOperationsCenterScreen")
s=root_content(s,"Operations")
s=title(s,"Operations")
s=rep(s,'''<View
        style={
          styles.hero
        }
      >''','''<View
        style={[
          styles.hero,
          windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
        ]}
      >''',"Operations hero")
changed["operations"]=save(p,b,s)

# Filing Extraction
p=P["extraction"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=add_hook(s,"FilingExtractionScreen")
s=root_content(s,"Extraction")
s=title(s,"Extraction")
s=rep(s,'''<View
        style={
          styles.inlineButtons
        }
      >''','''<View
        style={[
          styles.inlineButtons,
          windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
        ]}
      >''',"Extraction action row")
changed["extraction"]=save(p,b,s)

# Filing Import Bridge
p=P["bridge"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=add_hook(s,"FilingImportBridgeScreen")
s=root_content(s,"Bridge")
s=title(s,"Bridge")
s=rep(s,'''<View
          style={
            styles.actions
          }
        >''','''<View
          style={[
            styles.actions,
            windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
          ]}
        >''',"Bridge actions")
changed["bridge"]=save(p,b,s)

# Filing Submission History
p=P["history"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=add_hook(s,"FilingSubmissionHistoryScreen")
s=root_content(s,"History")
s=title(s,"History")
s=rep(s,'''<View
            style={
              styles.actions
            }
          >''','''<View
            style={[
              styles.actions,
              windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
            ]}
          >''',"History primary actions",1)
changed["history"]=save(p,b,s)

print("PC-030M20AV3G — Fundamental Operations & Filing Workflow Responsive Calibration")
for n in ["fundamental_import","operations","extraction","bridge","history"]:
    print(("UPDATED" if changed[n] else "NO CHANGE")+" — "+n)
print("PRESERVED — Fundamental Import validation/no-fabrication/no-portfolio-mutation safeguards.")
print("PRESERVED — operations dashboard services and registry routes.")
print("PRESERVED — extraction source-controlled evidence and filing-review handoff.")
print("PRESERVED — filing bridge cannot auto-verify, approve or promote.")
print("PRESERVED — submission retry, duplicate-resolution and archive workflows.")
