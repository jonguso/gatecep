from pathlib import Path
import re, sys
ROOT=Path(sys.argv[1])
T={k:ROOT/v for k,v in {
'wealth':'mobile/app/wealth-journey.js','choice':'mobile/app/goal-recovery-choice.js','allocation':'mobile/app/goal-recovery-allocation.js','preview':'mobile/app/goal-recovery-preview.js','basket':'mobile/app/basket-execution.js'}.items()}
for k,p in T.items():
    if not p.exists(): raise SystemExit(f'ERROR — missing target {k}: {p}')
MARK='PC-030M20AV3C RESPONSIVE CALIBRATION'

def add_import(s):
    if 'useWindowDimensions' in s:return s
    m=re.search(r'import\s*\{([\s\S]*?)\}\s*from\s*"react-native";',s)
    if not m: raise SystemExit('ERROR — react-native import anchor missing')
    body=m.group(1).rstrip()
    if body and not body.endswith(','): body+=','
    body+='\n  useWindowDimensions'
    return s[:m.start()]+'import {'+body+'\n} from "react-native";'+s[m.end():]

def hook(s,sig):
    if re.search(r'width\s*:\s*av3cWidth',s):return s
    if sig not in s: raise SystemExit(f'ERROR — component signature missing: {sig}')
    return s.replace(sig,sig+'\n  const { width: av3cWidth } = useWindowDimensions();',1)

def cexpr():
    return '[styles.content, av3cWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" }, av3cWidth < 720 && { paddingHorizontal: 16, paddingBottom: 128 }, av3cWidth < 480 && { paddingHorizontal: 12 }]'
def texpr():
    return '[styles.title, av3cWidth < 720 && { fontSize: 28, lineHeight: 34 }, av3cWidth < 480 && { fontSize: 25, lineHeight: 31 }]'
def once(s,old,new,label):
    if new in s:return s
    if old not in s:raise SystemExit(f'ERROR — {label} anchor missing')
    return s.replace(old,new,1)
def save(p,orig,s):
    if MARK not in s:
        e=s.find('export default')
        if e<0:raise SystemExit(f'ERROR — export default missing in {p.name}')
        s=s[:e]+'// '+MARK+'\n'+s[e:]
    if s==orig:return False
    b=p.with_suffix(p.suffix+'.pc030m20av3c.bak')
    if not b.exists():b.write_text(orig,encoding='utf-8')
    p.write_text(s,encoding='utf-8');return True

changed={}
# Wealth Journey
p=T['wealth'];o=p.read_text(encoding='utf-8');s=hook(add_import(o),'export default function WealthJourneyScreen() {')
old='contentContainerStyle={\n        styles.content\n      }'
s=once(s,old,'contentContainerStyle={'+cexpr()+'}','wealth content')
old='style={\n          styles.title\n        }'
s=once(s,old,'style={'+texpr()+'}','wealth title')
changed['wealth-journey']=save(p,o,s)
# Choice
p=T['choice'];o=p.read_text(encoding='utf-8');s=hook(add_import(o),'export default function GoalRecoveryChoice(){')
s=once(s,'<ScrollView style={styles.screen} contentContainerStyle={styles.content}>','<ScrollView style={styles.screen} contentContainerStyle={'+cexpr()+'}>','choice content')
s=once(s,'<Text style={styles.title}>Choose how you want to close the gap</Text>','<Text style={'+texpr()+'}>Choose how you want to close the gap</Text>','choice title')
changed['goal-recovery-choice']=save(p,o,s)
# Allocation
p=T['allocation'];o=p.read_text(encoding='utf-8');s=hook(add_import(o),'export default function GoalRecoveryAllocation() {')
s=once(s,'contentContainerStyle={styles.content}','contentContainerStyle={'+cexpr()+'}','allocation content')
s=once(s,'<Text style={styles.title}>Use the new money without worsening concentration</Text>','<Text style={'+texpr()+'}>Use the new money without worsening concentration</Text>','allocation title')
s=once(s,'<View style={styles.rowTop}>','<View style={[styles.rowTop, av3cWidth < 480 && { flexDirection: "column", alignItems: "flex-start" }]}>','allocation row top')
s=once(s,'<View key={row.sector} style={styles.exposureRow}>','<View key={row.sector} style={[styles.exposureRow, av3cWidth < 480 && { flexDirection: "column", alignItems: "flex-start", gap: 4 }]}>','allocation exposure')
changed['goal-recovery-allocation']=save(p,o,s)
# Preview
p=T['preview'];o=p.read_text(encoding='utf-8');s=hook(add_import(o),'export default function GoalRecoveryPortfolioPreview(){')
s=once(s,'<ScrollView style={styles.screen} contentContainerStyle={styles.content}>','<ScrollView style={styles.screen} contentContainerStyle={'+cexpr()+'}>','preview content')
s=once(s,'<Text style={styles.title}>Review the portfolio before broker execution</Text>','<Text style={'+texpr()+'}>Review the portfolio before broker execution</Text>','preview title')
s=once(s,'<View key={row.symbol} style={styles.orderRow}>','<View key={row.symbol} style={[styles.orderRow, av3cWidth < 480 && { flexDirection: "column" }]}>','preview order row')
s=once(s,'<Text style={styles.value}>KES {money(row.projectedGross)}</Text>','<Text style={[styles.value, av3cWidth < 480 && { textAlign: "left" }]}>KES {money(row.projectedGross)}</Text>','preview order value')
s=once(s,'<View key={row.sector} style={styles.sectorRow}>','<View key={row.sector} style={[styles.sectorRow, av3cWidth < 480 && { flexDirection: "column", alignItems: "flex-start" }]}>','preview sector row')
changed['goal-recovery-preview']=save(p,o,s)
# Basket Execution
p=T['basket'];o=p.read_text(encoding='utf-8');s=hook(add_import(o),'export default function BasketExecution() {')
if 'contentContainerStyle={styles.content}' in s:s=s.replace('contentContainerStyle={styles.content}','contentContainerStyle={'+cexpr()+'}')
elif cexpr() not in s:raise SystemExit('ERROR — basket content anchor missing')
s=once(s,'<View style={styles.headerRow}>','<View style={[styles.headerRow, av3cWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>','basket header')
s=s.replace('style={styles.title}','style={'+texpr()+'}')
s=once(s,'<View key={order.id} style={styles.orderRow}>','<View key={order.id} style={[styles.orderRow, av3cWidth < 520 && { flexDirection: "column", alignItems: "stretch" }]}>','basket order row')
changed['basket-execution']=save(p,o,s)
print('PC-030M20AV3C — Recovery & Wealth Journey Responsive Calibration')
for k,v in changed.items():print(('UPDATED' if v else 'NO CHANGE')+' — '+k)
print('PRESERVED — wealth/goal/recovery calculations and canonical REAL evidence.')
print('PRESERVED — verified fee and basket cost semantics.')
print('PRESERVED — Broker Action Plan remains advisory/import-gated.')
