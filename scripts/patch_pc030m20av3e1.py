
from pathlib import Path
import re, sys

ROOT=Path(sys.argv[1]).resolve()
MARK="PC-030M20AV3E RESPONSIVE CALIBRATION"
RECOVERY="PC-030M20AV3E1 PARTIAL-APPLY RECOVERY"
P={
 "holdings":ROOT/"mobile/app/holding-details.js",
 "rebalancing":ROOT/"mobile/app/portfolio-rebalancing.js",
 "risk":ROOT/"mobile/app/portfolio-risk.js",
 "analytics":ROOT/"mobile/app/unified-portfolio-analytics.js",
 "performance":ROOT/"mobile/app/performance.js",
 "hub":ROOT/"mobile/app/portfolio-hub.js",
}
for n,p in P.items():
    if not p.exists(): raise SystemExit(f"ERROR — missing {n}: {p}")

def rep(s,a,b,label,count=1):
    if b in s:return s
    if a not in s:raise SystemExit(f"ERROR — {label} anchor not found")
    return s.replace(a,b,count)

def add_rn_import(s,name):
    m=re.search(r'import\s*\{([\s\S]*?)\}\s*from\s*"react-native";',s)
    if not m:raise SystemExit(f"ERROR — react-native import missing for {name}")
    if re.search(rf'\b{re.escape(name)}\b',m.group(0)):return s
    body=m.group(1).rstrip()
    if body and not body.endswith(","):body+=","
    body+="\n  "+name
    return s[:m.start()]+"import {"+body+'\n} from "react-native";'+s[m.end():]

def mark(s):
    if MARK in s:return s
    i=s.find("export default")
    if i<0:raise SystemExit("ERROR — export default anchor missing")
    return s[:i]+"// "+MARK+"\n"+s[i:]

def save(p,b,s,suffix=".pc030m20av3e1.bak"):
    s=mark(s)
    if s==b:return False
    bak=Path(str(p)+suffix)
    if not bak.exists():bak.write_text(b,encoding="utf-8")
    p.write_text(s,encoding="utf-8")
    return True

def validate_holdings(s):
    required=[
      MARK,"useWindowDimensions","av3eWidth",
      "maxWidth: 960","paddingBottom: 128",
      "compact={av3eWidth < 520}",
      'GateCEP did not switch to Practice.'
    ]
    missing=[x for x in required if x not in s]
    if missing: raise SystemExit("ERROR — Holdings partial apply is incomplete: "+", ".join(missing))

changed={}

# Holdings was written before the AV3E failure. Validate it instead of touching it again.
hs=P["holdings"].read_text(encoding="utf-8")
if MARK in hs:
    validate_holdings(hs)
    changed["holdings"]=False
else:
    raise SystemExit("ERROR — Expected AV3E Holdings partial apply was not found. Do not continue with recovery package.")

# Rebalancing: patch from original current source. The original AV3E failed because healthHero is multiline.
p=P["rebalancing"];b=p.read_text(encoding="utf-8");s=b
s=rep(s,'const { height: windowHeight } = useWindowDimensions();',
      'const { width: windowWidth, height: windowHeight } = useWindowDimensions();',
      "Rebalancing width hook")
s=rep(s,'''contentContainerStyle={
        styles.content
      }''','''contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}''',"Rebalancing content")
s=rep(s,'''style={
          styles.title
        }''','''style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}''',"Rebalancing title")
s=rep(s,'<View style={styles.headerActions}>',
      '<View style={[styles.headerActions, windowWidth < 520 && { flexWrap: "wrap" }]}>',
      "Rebalancing header")
s=rep(s,'''<View
          style={
            styles.healthHero
          }
        >''','''<View
          style={[
            styles.healthHero,
            windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
          ]}
        >''',"Rebalancing multiline health hero")
changed["rebalancing"]=save(p,b,s)

# Risk
p=P["risk"];b=p.read_text(encoding="utf-8");s=b
s=rep(s,'<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>','''<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}>''',"Risk content")
s=rep(s,'<View style={styles.pageHeader}>',
      '<View style={[styles.pageHeader, windowWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>',
      "Risk header")
s=rep(s,'<Text style={styles.title}>Portfolio Risk</Text>',
      '<Text style={[styles.title, windowWidth < 720 && { fontSize: 28, lineHeight: 34 }, windowWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>Portfolio Risk</Text>',
      "Risk title")
s=rep(s,'<View style={activeSection ? styles.hidden : styles.hero}>',
      '<View style={[activeSection ? styles.hidden : styles.hero, windowWidth < 520 && !activeSection && { flexDirection: "column", alignItems: "stretch" }]}>',
      "Risk hero")
changed["risk"]=save(p,b,s)

# Unified analytics
p=P["analytics"];b=p.read_text(encoding="utf-8");s=b
s=rep(s,'<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>','''<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}>''',"Analytics content")
s=rep(s,'<View style={styles.headerRow}>',
      '<View style={[styles.headerRow, windowWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>',
      "Analytics header")
s=rep(s,'<Text style={styles.title}>Portfolio Analysis</Text>',
      '<Text style={[styles.title, windowWidth < 720 && { fontSize: 28, lineHeight: 34 }, windowWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>Portfolio Analysis</Text>',
      "Analytics title")
s=rep(s,'<View style={[styles.hero, activeSection && styles.hidden]}>',
      '<View style={[styles.hero, activeSection && styles.hidden, windowWidth < 520 && !activeSection && { flexDirection: "column", alignItems: "stretch" }]}>',
      "Analytics hero")
changed["analytics"]=save(p,b,s)

# Preserve already-correct boundaries.
perf=P["performance"].read_text(encoding="utf-8")
if "av3bContentWide" not in perf or "useWindowDimensions" not in perf:
    raise SystemExit("ERROR — Performance AV3B responsive calibration missing")
hub=P["hub"].read_text(encoding="utf-8")
if 'export { default } from "../src/features/portfolio-home/PortfolioHomeScreen";' not in hub:
    raise SystemExit("ERROR — portfolio-hub canonical re-export changed")

print("PC-030M20AV3E1 — Partial-Apply Recovery")
print("VALIDATED — holdings (AV3E partial apply already present)")
for n in ["rebalancing","risk","analytics"]:
    print(("UPDATED" if changed[n] else "NO CHANGE")+" — "+n)
print("PRESERVED — Performance AV3B responsive calibration.")
print("PRESERVED — portfolio-hub canonical PortfolioHomeScreen re-export.")
print("PRESERVED — REAL/Practice, advisory, risk, analytics and historical-integrity contracts.")
