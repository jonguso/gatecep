
from pathlib import Path
import re, sys

ROOT = Path(sys.argv[1]).resolve()
MARK = "PC-030M20AV3D RESPONSIVE CALIBRATION"
files = {
 "trading":ROOT/"mobile/app/(tabs)/trading.js",
 "order":ROOT/"mobile/app/order-book.js",
 "history":ROOT/"mobile/app/trade-history.js",
 "transactions":ROOT/"mobile/app/transactions.js",
 "upload":ROOT/"mobile/app/transactions-upload.js",
 "sync":ROOT/"mobile/app/portfolio-sync-center.js",
}
for n,p in files.items():
    if not p.exists(): raise SystemExit(f"ERROR — missing {n}: {p}")

def rep(s,a,b,label,count=1):
    if b in s: return s
    if a not in s: raise SystemExit(f"ERROR — {label} anchor not found")
    return s.replace(a,b,count)

def add_import(s,name):
    m=re.search(r'import\s*\{([\s\S]*?)\}\s*from\s*"react-native";',s)
    if not m: raise SystemExit(f"ERROR — react-native import missing: {name}")
    if name in m.group(0): return s
    body=m.group(1).rstrip()
    if body and not body.endswith(","): body += ","
    body += "\n  "+name
    return s[:m.start()]+"import {"+body+'\n} from "react-native";'+s[m.end():]

def mark(s):
    if MARK in s: return s
    i=s.find("export default")
    if i<0: raise SystemExit("ERROR — export default missing")
    return s[:i]+"// "+MARK+"\n"+s[i:]

def save(p,before,s):
    s=mark(s)
    if s==before:return False
    bak=Path(str(p)+".pc030m20av3d.bak")
    if not bak.exists():bak.write_text(before,encoding="utf-8")
    p.write_text(s,encoding="utf-8");return True

def content(w):
    return f'''[
      styles.content,
      {w} >= 720 && {{ width: "100%", maxWidth: 960, alignSelf: "center" }},
      {w} < 720 && {{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 }},
      {w} < 480 && {{ paddingHorizontal: 12, paddingTop: 24 }}
    ]'''

def title(w,base="styles.title"):
    return f'''[
      {base},
      {w} < 720 && {{ fontSize: 28, lineHeight: 34 }},
      {w} < 480 && {{ fontSize: 25, lineHeight: 31 }}
    ]'''

changed={}

p=files["trading"];b=p.read_text(encoding="utf-8");s=b
s=add_import(s,"useWindowDimensions")
s=rep(s,'function DecisionLabHome({ data, entryParams }) {\n','function DecisionLabHome({ data, entryParams }) {\n  const { width: decisionWidth } = useWindowDimensions();\n',"Trading DecisionLab hook")
s=rep(s,'export default function Trading() {\n','export default function Trading() {\n  const { width: av3dWidth } = useWindowDimensions();\n',"Trading hook")
s=rep(s,'return <ScrollView style={s.screen} contentContainerStyle={s.content}>',
'''return <ScrollView style={s.screen} contentContainerStyle={[
      s.content,
      av3dWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
      av3dWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
      av3dWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
    ]}>''',"Trading content")
s=rep(s,'<View style={s.header}>','<View style={[s.header, av3dWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>',"Trading header")
s=rep(s,'<Text style={s.title}>Trading</Text>','<Text style={[s.title, av3dWidth < 720 && { fontSize: 28, lineHeight: 34 }, av3dWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>Trading</Text>',"Trading title")
s=rep(s,'<View key={row.lossPercent} style={ui.recoveryRow}>','<View key={row.lossPercent} style={[ui.recoveryRow, decisionWidth < 480 && { flexDirection: "column" }]}>',"Trading recovery row")
s=rep(s,'<Text style={ui.recoveryNeed}>needs +{row.recoveryPercent}% to recover</Text>','<Text style={[ui.recoveryNeed, decisionWidth < 480 && { textAlign: "left" }]}>needs +{row.recoveryPercent}% to recover</Text>',"Trading recovery text")
s=rep(s,'<ScrollView style={ui.modal} contentContainerStyle={{paddingBottom:30}}>','<ScrollView style={[ui.modal, decisionWidth >= 720 && { width: "100%", maxWidth: 760, alignSelf: "center" }]} contentContainerStyle={{paddingBottom:30}}>',"Trading modal")
changed["trading"]=save(p,b,s)

for key,signature,row,titleText in [
 ("order","export default function OrderBook() {","orderRow","Practice Order Book"),
 ("history","export default function TradeHistory() {","tradeRow","Trade History")
]:
 p=files[key];b=p.read_text(encoding="utf-8");s=b
 s=add_import(s,"useWindowDimensions")
 s=rep(s,signature+"\n",signature+'\n  const { width: av3dWidth } = useWindowDimensions();\n',key+" hook")
 s=rep(s,'contentContainerStyle={styles.content}','contentContainerStyle={'+content("av3dWidth")+'}',key+" content")
 s=rep(s,'<View style={styles.headerRow}>','<View style={[styles.headerRow, av3dWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>',key+" header")
 s=rep(s,f'<Text style={{styles.title}}>{titleText}</Text>','<Text style={'+title("av3dWidth")+'}>'+titleText+'</Text>',key+" title")
 s=rep(s,f'style={{styles.{row}}}',f'style={{[styles.{row}, av3dWidth < 520 && {{ flexDirection: "column" }}]}}',key+" row")
 s=rep(s,'<View style={styles.right}>','<View style={[styles.right, av3dWidth < 520 && { alignItems: "flex-start", minWidth: 0 }]}>',key+" right")
 changed[key]=save(p,b,s)

p=files["transactions"];b=p.read_text(encoding="utf-8");s=b
s=add_import(s,"useWindowDimensions")
s=rep(s,'export default function Transactions() {\n','export default function Transactions() {\n  const { width: av3dWidth } = useWindowDimensions();\n',"Transactions hook")
s=rep(s,'contentContainerStyle={styles.content}','contentContainerStyle={'+content("av3dWidth")+'}',"Transactions content")
s=rep(s,'<View style={styles.headerRow}>','<View style={[styles.headerRow, av3dWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>',"Transactions header")
s=rep(s,'<Text style={styles.title}>Transaction Reconciliation</Text>','<Text style={'+title("av3dWidth")+'}>Transaction Reconciliation</Text>',"Transactions title")
s=s.replace('<View style={styles.sectionHeader}>','<View style={[styles.sectionHeader, av3dWidth < 520 && { flexDirection: "column", alignItems: "stretch" }]}>')
changed["transactions"]=save(p,b,s)

p=files["upload"];b=p.read_text(encoding="utf-8");s=b
s=add_import(s,"useWindowDimensions")
s=rep(s,'export default function TransactionsUpload() {\n','export default function TransactionsUpload() {\n  const { width: av3dWidth } = useWindowDimensions();\n',"Upload hook")
s=rep(s,'contentContainerStyle={styles.content}','contentContainerStyle={'+content("av3dWidth")+'}',"Upload content")
s=rep(s,'<View style={styles.headerRow}>','<View style={[styles.headerRow, av3dWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>',"Upload header")
s=rep(s,'<Text style={styles.title}>Broker Execution Upload</Text>','<Text style={'+title("av3dWidth")+'}>Broker Execution Upload</Text>',"Upload title")
s=rep(s,'<View key={tx.id} style={styles.row}>','<View key={tx.id} style={[styles.row, av3dWidth < 520 && { flexDirection: "column" }]}>',"Upload row")
s=rep(s,'<View style={{ alignItems: "flex-end" }}>','<View style={{ alignItems: av3dWidth < 520 ? "flex-start" : "flex-end" }}>',"Upload value")
changed["upload"]=save(p,b,s)

p=files["sync"];b=p.read_text(encoding="utf-8");s=b
s=add_import(s,"useWindowDimensions")
s=rep(s,'export default function PortfolioSyncCenter() {\n','export default function PortfolioSyncCenter() {\n  const { width: av3dWidth } = useWindowDimensions();\n',"Sync hook")
for label in ["Portfolio Valuation","Cash / Ledger Statement","Transaction / Lot History"]:
 s=rep(s,f'<EvidenceRow\n          label="{label}"',f'<EvidenceRow\n          compact={{av3dWidth < 520}}\n          label="{label}"',"Sync "+label)
s=rep(s,'<View style={styles.modalActions}>','<View style={[styles.modalActions, av3dWidth < 480 && { flexDirection: "column" }]}>',"Sync modal")
s=rep(s,'function EvidenceRow({ label, ready, value, actionLabel, onPress, disabled = false }) {','function EvidenceRow({ label, ready, value, actionLabel, onPress, disabled = false, compact = false }) {',"Sync EvidenceRow")
s=rep(s,'<View style={styles.evidenceRow}>','<View style={[styles.evidenceRow, compact && { flexDirection: "column", alignItems: "stretch" }]}>',"Sync row")
s=rep(s,'<Pressable style={[styles.smallButton, disabled && styles.disabled]} disabled={disabled} onPress={onPress}>','<Pressable style={[styles.smallButton, compact && { alignSelf: "stretch", alignItems: "center" }, disabled && styles.disabled]} disabled={disabled} onPress={onPress}>',"Sync action")
changed["sync"]=save(p,b,s)

print("PC-030M20AV3D — Trading & Transaction Responsive Calibration")
for n in ["trading","order","history","transactions","upload","sync"]:print(("UPDATED" if changed[n] else "NO CHANGE")+" — "+n)
print("PRESERVED — Decision Lab, Practice records, reconciliation and broker evidence logic.")
print("PRESERVED — reconciliation evidence tables remain horizontally scrollable.")
print("PRESERVED — Portfolio Sync Center three-evidence gate and explicit broker snapshot confirmation.")
