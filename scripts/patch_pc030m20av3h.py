
from pathlib import Path
import re, sys

ROOT=Path(sys.argv[1]).resolve()
P=ROOT/"mobile/app/multi-period-filing-extraction.js"
MARK="PC-030M20AV3H RESPONSIVE CALIBRATION"

if not P.exists():
    raise SystemExit(f"ERROR — missing target: {P}")

def rep(s,a,b,label,count=1):
    if b in s:
        return s
    if a not in s:
        raise SystemExit(f"ERROR — {label} anchor not found")
    return s.replace(a,b,count)

def add_rn(s,name):
    m=re.search(r'import\s*\{([\s\S]*?)\}\s*from\s*"react-native";',s)
    if not m:
        raise SystemExit("ERROR — react-native import anchor missing")
    if re.search(rf'\b{re.escape(name)}\b',m.group(0)):
        return s
    body=m.group(1).rstrip()
    if body and not body.endswith(","):
        body+=","
    body+="\n  "+name
    return s[:m.start()]+"import {"+body+'\n} from "react-native";'+s[m.end():]

b=P.read_text(encoding="utf-8")
s=b
s=add_rn(s,"useWindowDimensions")

s=rep(s,
    "export default function MultiPeriodFilingExtractionScreen() {\n",
    'export default function MultiPeriodFilingExtractionScreen() {\n  const { width: windowWidth } = useWindowDimensions();\n',
    "screen width hook")

s=rep(s,
    '''contentContainerStyle={
        styles.content
      }''',
    '''contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}''',
    "responsive content")

s=rep(s,
    '''style={
          styles.title
        }''',
    '''style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}''',
    "responsive title")

s=rep(s,
    '''<View
              style={
                styles.metricGrid
              }
            >''',
    '''<View
              style={[
                styles.metricGrid,
                windowWidth < 380 && { flexDirection: "column" }
              ]}
            >''',
    "metric grid")

s=rep(s,
    '''metricCard: {
      width:
        "47%",''',
    '''metricCard: {
      width:
        "47%",

      flexGrow:
        1,

      minWidth:
        140,''',
    "metric card resilience")

s=rep(s,
    '''row: {
      flexDirection:
        "row",

      justifyContent:''',
    '''row: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:''',
    "row wrapping")

if MARK not in s:
    i=s.find("export default")
    if i < 0:
        raise SystemExit("ERROR — export default anchor missing")
    s=s[:i]+"// "+MARK+"\n"+s[i:]

if s != b:
    bak=Path(str(P)+".pc030m20av3h.bak")
    if not bak.exists():
        bak.write_text(b,encoding="utf-8")
    P.write_text(s,encoding="utf-8")
    print("UPDATED — multi-period-filing-extraction")
else:
    print("NO CHANGE — multi-period-filing-extraction")

print("PRESERVED — multi-period comparison and filing-ready JSON services.")
print("PRESERVED — source coverage, duplicate/outlier and validation evidence.")
print("PRESERVED — unusual changes remain review-only and are never auto-corrected.")
print("PRESERVED — filing approval and repository promotion remain controlled by PC-025C.")
print("PRESERVED — draft/review submission handoff and Verified Filings route.")
print("PC-030M20AV3H applied successfully.")
