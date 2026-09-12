
from pathlib import Path
import re, sys

ROOT=Path(sys.argv[1]).resolve()
MARK="PC-030M20AV3E RESPONSIVE CALIBRATION"
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

def add_import(s,name):
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

def save(p,b,s):
    s=mark(s)
    if s==b:return False
    bak=Path(str(p)+".pc030m20av3e.bak")
    if not bak.exists():bak.write_text(b,encoding="utf-8")
    p.write_text(s,encoding="utf-8");return True

changed={}

p=P["holdings"];b=p.read_text(encoding="utf-8");s=b
s=add_import(s,"useWindowDimensions")
s=rep(s,'export default function HoldingDetails() {\n','export default function HoldingDetails() {\n  const { width: av3eWidth } = useWindowDimensions();\n',"Holdings hook")
s=rep(s,'contentContainerStyle={styles.content}','''contentContainerStyle={[
          styles.content,
          av3eWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
          av3eWidth < 720 && { paddingHorizontal: 16, paddingBottom: 128 },
          av3eWidth < 480 && { paddingHorizontal: 12 }
        ]}''',"Holdings content")
s=rep(s,'<View style={styles.header}>','<View style={[styles.header, av3eWidth < 520 && { flexWrap: "wrap" }]}>',"Holdings header")
s=rep(s,'<View style={styles.summary}>','<View style={[styles.summary, av3eWidth < 480 && { flexDirection: "column" }]}>',"Holdings summary")
s=rep(s,'<HoldingDetailCard security={selectedSecurity.security} totalValue={summary.totalValue} />','<HoldingDetailCard security={selectedSecurity.security} totalValue={summary.totalValue} compact={av3eWidth < 520} />',"Holdings detail prop")
s=rep(s,'{securities.map((security, index) => <HoldingListRow key={`${security.symbol || "SECURITY"}-${security.broker || "ALL"}-${index}`} security={security} totalValue={summary.totalValue} onPress={() => setSelectedSecurity({ security, index })} />)}','{securities.map((security, index) => <HoldingListRow key={`${security.symbol || "SECURITY"}-${security.broker || "ALL"}-${index}`} security={security} totalValue={summary.totalValue} compact={av3eWidth < 520} onPress={() => setSelectedSecurity({ security, index })} />)}',"Holdings list prop")
s=rep(s,'function HoldingListRow({ security, totalValue, onPress }) {','function HoldingListRow({ security, totalValue, onPress, compact = false }) {',"HoldingListRow signature")
s=rep(s,'style={({ pressed }) => [styles.holdingListRow, pressed && styles.holdingListRowPressed]}','style={({ pressed }) => [styles.holdingListRow, compact && { flexDirection: "column", alignItems: "stretch" }, pressed && styles.holdingListRowPressed]}',"Holdings list row")
s=rep(s,'function HoldingDetailCard({ security, totalValue }) {','function HoldingDetailCard({ security, totalValue, compact = false }) {',"HoldingDetail signature")
s=rep(s,'<View style={styles.security}><View style={styles.securityHeader}>','<View style={styles.security}><View style={[styles.securityHeader, compact && { flexDirection: "column", alignItems: "stretch" }]}>',"Holdings detail header")
changed["holdings"]=save(p,b,s)

p=P["rebalancing"];b=p.read_text(encoding="utf-8");s=b
s=rep(s,'const { height: windowHeight } = useWindowDimensions();','const { width: windowWidth, height: windowHeight } = useWindowDimensions();',"Rebalancing width")
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
s=rep(s,'<View style={styles.headerActions}>','<View style={[styles.headerActions, windowWidth < 520 && { flexWrap: "wrap" }]}>',"Rebalancing header")
s=rep(s,'<View style={styles.healthHero}>','<View style={[styles.healthHero, windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }]}>',"Rebalancing hero")
changed["rebalancing"]=save(p,b,s)

p=P["risk"];b=p.read_text(encoding="utf-8");s=b
s=rep(s,'<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>','''<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}>''',"Risk content")
s=rep(s,'<View style={styles.pageHeader}>','<View style={[styles.pageHeader, windowWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>',"Risk header")
s=rep(s,'<Text style={styles.title}>Portfolio Risk</Text>','<Text style={[styles.title, windowWidth < 720 && { fontSize: 28, lineHeight: 34 }, windowWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>Portfolio Risk</Text>',"Risk title")
s=rep(s,'<View style={activeSection ? styles.hidden : styles.hero}>','<View style={[activeSection ? styles.hidden : styles.hero, windowWidth < 520 && !activeSection && { flexDirection: "column", alignItems: "stretch" }]}>',"Risk hero")
changed["risk"]=save(p,b,s)

p=P["analytics"];b=p.read_text(encoding="utf-8");s=b
s=rep(s,'<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>','''<ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}>''',"Analytics content")
s=rep(s,'<View style={styles.headerRow}>','<View style={[styles.headerRow, windowWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>',"Analytics header")
s=rep(s,'<Text style={styles.title}>Portfolio Analysis</Text>','<Text style={[styles.title, windowWidth < 720 && { fontSize: 28, lineHeight: 34 }, windowWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>Portfolio Analysis</Text>',"Analytics title")
s=rep(s,'<View style={[styles.hero, activeSection && styles.hidden]}>','<View style={[styles.hero, activeSection && styles.hidden, windowWidth < 520 && !activeSection && { flexDirection: "column", alignItems: "stretch" }]}>',"Analytics hero")
changed["analytics"]=save(p,b,s)

perf=P["performance"].read_text(encoding="utf-8")
if "av3bContentWide" not in perf or "useWindowDimensions" not in perf:raise SystemExit("ERROR — Performance AV3B responsive calibration missing; AV3E will not overwrite it")
hub=P["hub"].read_text(encoding="utf-8")
if 'export { default } from "../src/features/portfolio-home/PortfolioHomeScreen";' not in hub:raise SystemExit("ERROR — portfolio-hub canonical re-export changed")

print("PC-030M20AV3E — Portfolio Analysis & Risk Responsive Calibration")
for n in ["holdings","rebalancing","risk","analytics"]:print(("UPDATED" if changed[n] else "NO CHANGE")+" — "+n)
print("PRESERVED — Performance AV3B responsive calibration; no AV3E rewrite.")
print("PRESERVED — portfolio-hub canonical PortfolioHomeScreen re-export.")
print("PRESERVED — REAL portfolio, risk, rebalancing, analytics and historical-integrity contracts.")
