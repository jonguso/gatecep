
from pathlib import Path
import re, sys

ROOT=Path(sys.argv[1]).resolve()
MARK="PC-030M20AV3I RESPONSIVE CALIBRATION"
P={
    "investment":ROOT/"mobile/app/investment-intelligence.js",
    "market":ROOT/"mobile/app/market-price-import.js",
    "broker":ROOT/"mobile/app/broker-marketplace.js",
}
for n,p in P.items():
    if not p.exists():
        raise SystemExit(f"ERROR — missing {n}: {p}")

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

def mark(s):
    if MARK in s:
        return s
    i=s.find("export default")
    if i<0:
        raise SystemExit("ERROR — export default anchor missing")
    return s[:i]+"// "+MARK+"\n"+s[i:]

def save(p,b,s):
    s=mark(s)
    if s==b:
        return False
    bak=Path(str(p)+".pc030m20av3i.bak")
    if not bak.exists():
        bak.write_text(b,encoding="utf-8")
    p.write_text(s,encoding="utf-8")
    return True

changed={}

# ------------------------------------------------------------
# Investment Intelligence
# ------------------------------------------------------------
p=P["investment"]; b=p.read_text(encoding="utf-8"); s=b
s=add_rn(s,"useWindowDimensions")
s=rep(
    s,
    "export default function InvestmentIntelligenceScreen() {\n",
    'export default function InvestmentIntelligenceScreen() {\n  const { width: windowWidth } = useWindowDimensions();\n',
    "Investment Intelligence width hook"
)
s=rep(
    s,
    '<ScrollView style={styles.screen} contentContainerStyle={styles.content}>',
    '''<ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}
    >''',
    "Investment Intelligence content"
)
s=rep(
    s,
    '<Text style={styles.title}>Coach G Investment Intelligence</Text>',
    '''<Text
        style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}
      >
        Coach G Investment Intelligence
      </Text>''',
    "Investment Intelligence title"
)
s=rep(
    s,
    '<View style={styles.hero}>',
    '''<View
        style={[
          styles.hero,
          windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
        ]}
      >''',
    "Investment Intelligence hero"
)
s=rep(
    s,
    '<View style={styles.metricGrid}>',
    '''<View
        style={[
          styles.metricGrid,
          windowWidth < 420 && { flexDirection: "column" }
        ]}
      >''',
    "Investment Intelligence metric grid"
)
s=rep(
    s,
    'metricCard: {\n    width: "47%",',
    'metricCard: {\n    width: "47%",\n    flexGrow: 1,\n    minWidth: 140,',
    "Investment Intelligence metric card"
)
s=rep(
    s,
    'scoreMetric: { width: "47%", backgroundColor:',
    'scoreMetric: { width: "47%", flexGrow: 1, minWidth: 140, backgroundColor:',
    "Investment Intelligence score metric"
)
s=rep(
    s,
    'row: { flexDirection: "row", justifyContent: "space-between", gap: 14, marginTop: 10 },',
    'row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 14, marginTop: 10 },',
    "Investment Intelligence rows"
)
s=rep(
    s,
    '''cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },''',
    '''cardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },''',
    "Investment Intelligence card headers"
)
changed["investment"]=save(p,b,s)

# ------------------------------------------------------------
# Market Price Import
# Already uses canonical MobileScreen/MobileUI responsive shell.
# Only calibrate the local evidence rows and mark the screen.
# ------------------------------------------------------------
p=P["market"]; b=p.read_text(encoding="utf-8"); s=b
s=rep(
    s,
    'row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 9, borderBottomColor: "#1e293b", borderBottomWidth: 1 },',
    'row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12, paddingVertical: 9, borderBottomColor: "#1e293b", borderBottomWidth: 1 },',
    "Market Price Import rows"
)
s=rep(
    s,
    'rowValue: { color: "white", fontWeight: "900", textAlign: "right", flex: 1 },',
    'rowValue: { color: "white", fontWeight: "900", textAlign: "right", flex: 1, minWidth: 120 },',
    "Market Price Import row values"
)
s=rep(
    s,
    'checksum: { color: "#64748b", fontSize: 9, marginTop: 12 }',
    'checksum: { color: "#64748b", fontSize: 9, marginTop: 12, flexShrink: 1 }',
    "Market Price Import checksum"
)
changed["market"]=save(p,b,s)

# ------------------------------------------------------------
# Broker Marketplace
# ------------------------------------------------------------
p=P["broker"]; b=p.read_text(encoding="utf-8"); s=b
s=add_rn(s,"useWindowDimensions")
s=rep(
    s,
    "export default function BrokerMarketplace() {\n",
    'export default function BrokerMarketplace() {\n  const { width: windowWidth } = useWindowDimensions();\n',
    "Broker Marketplace width hook"
)
s=rep(
    s,
    '<ScrollView style={styles.screen} contentContainerStyle={styles.content}>',
    '''<ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}
    >''',
    "Broker Marketplace content"
)
s=rep(
    s,
    '<Text style={styles.title}>Broker Marketplace</Text>',
    '''<Text
        style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}
      >
        Broker Marketplace
      </Text>''',
    "Broker Marketplace title"
)
changed["broker"]=save(p,b,s)

print("PC-030M20AV3I — Remaining Utility Responsive Calibration")
print(("UPDATED" if changed["investment"] else "NO CHANGE")+" — investment-intelligence")
print(("UPDATED" if changed["market"] else "NO CHANGE")+" — market-price-import")
print(("UPDATED" if changed["broker"] else "NO CHANGE")+" — broker-marketplace")
print("PRESERVED — Coach G Investment Intelligence remains advisory-only and does not place trades or mutate holdings/cash.")
print("PRESERVED — Market Price Import remains restricted price-only evidence; holdings, quantities, cash and cost basis do not change.")
print("PRESERVED — Market Price Import continues to use canonical MobileScreen / StickyActionBar shell.")
print("PRESERVED — Broker Marketplace only routes users to the existing broker-account linking flow.")
print("PRESERVED — legacy watchlist-old.js remains untouched because no active route reference was discovered.")
print("PC-030M20AV3I applied successfully.")
