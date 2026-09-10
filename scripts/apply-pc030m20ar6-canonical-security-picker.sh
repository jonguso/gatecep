#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"
[[ -f "$TRADING" ]] || { echo "ERROR — Trading screen missing"; exit 1; }
echo "PC-030M20AR6 — Canonical Security Picker & Conversation De-duplication"
python - "$TRADING" <<'PY'
from pathlib import Path
import re,sys
p=Path(sys.argv[1]); s=p.read_text(encoding='utf-8')
if 'coachGDecisionDialogueService' not in s or 'coachGDecisionAccommodationService' not in s:
    raise SystemExit('ERROR — M20AR4/M20AR3 conversation layers not found; refusing unsafe patch')
# import canonical security master list alongside existing lookup
s=s.replace('import { getSecurityBySymbol } from "../../src/utils/nseSecurityMaster";', 'import { NSE_SECURITIES, getSecurityBySymbol } from "../../src/utils/nseSecurityMaster";',1)
if 'NSE_SECURITIES' not in s: raise SystemExit('ERROR — security-master import anchor missing')
# selected symbol remains canonical; query is user typing only
anchor='  const [ideaSymbol, setIdeaSymbol] = React.useState("");'
if 'const [securityQuery, setSecurityQuery]' not in s:
    if anchor not in s: raise SystemExit('ERROR — ideaSymbol state anchor missing')
    s=s.replace(anchor,anchor+'\n  const [securityQuery, setSecurityQuery] = React.useState("");\n  const [securityPickerError, setSecurityPickerError] = React.useState("");',1)
# derive selected security and matches before holdings
anchor='  const holdings = '
if 'const selectedSecurity=' not in s:
    i=s.find(anchor)
    if i<0: raise SystemExit('ERROR — holdings anchor missing')
    helper='''  const selectedSecurity = React.useMemo(() => NSE_SECURITIES.find(x => String(x.symbol||"").toUpperCase() === String(ideaSymbol||"").toUpperCase()) || null, [ideaSymbol]);\n  const securityMatches = React.useMemo(() => {\n    const q=String(securityQuery||"").trim().toLowerCase();\n    if(!q) return [];\n    return NSE_SECURITIES.filter(x => [x.symbol,x.name,...(Array.isArray(x.aliases)?x.aliases:[])].some(v=>String(v||"").toLowerCase().includes(q))).slice(0,8);\n  }, [securityQuery]);\n  function chooseSecurity(security) {\n    setIdeaSymbol(String(security?.symbol||"").toUpperCase());\n    setSecurityQuery(`${security?.symbol || ""} — ${security?.name || ""}`);\n    setSecurityPickerError("");\n    setCoachTurn(null); setAccommodation(null); setShowAlternatives(false);\n  }\n  function changeSecurityQuery(value) {\n    setSecurityQuery(value); setIdeaSymbol(""); setSecurityPickerError("");\n    setCoachTurn(null); setAccommodation(null); setShowAlternatives(false);\n  }\n'''
    s=s[:i]+helper+s[i:]
# clear picker on new dialogue (except route could hydrate later)
s=s.replace('    setIdeaSide(side);\n    setCoachTurn(null);', '    setIdeaSide(side);\n    setIdeaSymbol(""); setSecurityQuery(""); setSecurityPickerError("");\n    setCoachTurn(null);',1)
# validation at askCoach before scenario creation
needle='  function askCoach() {\n    const scenario=createDecisionScenario('
if needle in s:
    repl='''  function askCoach() {\n    const typedSecurity=String(securityQuery||"").trim();\n    if(typedSecurity && !selectedSecurity) {\n      const message="Select a security from the NSE list so I can use the correct portfolio and sector evidence.";\n      setSecurityPickerError(message);\n      addDialogueTurn({role:"COACH",text:message,question:"Which listed security did you mean?"});\n      return;\n    }\n    const scenario=createDecisionScenario('''
    s=s.replace(needle,repl,1)
elif 'Select a security from the NSE list' not in s:
    raise SystemExit('ERROR — askCoach anchor missing')
# ensure scenario gets selected canonical symbol, not typed query
s=s.replace('security:ideaSymbol,action:ideaSide', 'security:selectedSecurity?.symbol || "",action:ideaSide',1)
# continue simulation uses canonical selected symbol already ideaSymbol; it is only set by chooseSecurity
# styles for suggestions
style_anchor='question:{color:"#fff",fontWeight:"900",marginTop:6,lineHeight:20}'
if 'securityList:' not in s:
    replacement=style_anchor+', securityList:{marginTop:6,borderColor:"#334155",borderWidth:1,borderRadius:10,overflow:"hidden"}, securityChoice:{paddingVertical:10,paddingHorizontal:11,backgroundColor:"#0f172a",borderBottomColor:"#1e293b",borderBottomWidth:1}, securityChoiceTitle:{color:"#fff",fontWeight:"900"}, securityChoiceMeta:{color:"#94a3b8",fontSize:12,marginTop:2}, securitySelected:{color:"#67e8f9",fontSize:12,fontWeight:"800",marginTop:6}, inputError:{color:"#fca5a5",fontSize:12,fontWeight:"800",marginTop:6}'
    if style_anchor not in s: raise SystemExit('ERROR — style anchor missing')
    s=s.replace(style_anchor,replacement,1)
# replace free text security field with master-backed searchable picker
old='<Text style={[ui.body,{marginTop:12}]}>Security (optional for open what-if)</Text><TextInput value={ideaSymbol} onChangeText={setIdeaSymbol} autoCapitalize="characters" placeholder="e.g. COOP" placeholderTextColor="#64748b" style={ui.input}/>'
new='''<Text style={[ui.body,{marginTop:12}]}>Security (optional for open what-if)</Text><TextInput value={securityQuery} onChangeText={changeSecurityQuery} autoCapitalize="characters" placeholder="Search NSE security" placeholderTextColor="#64748b" style={ui.input}/>{selectedSecurity?<Text style={ui.securitySelected}>Selected: {selectedSecurity.symbol} — {selectedSecurity.name} • {selectedSecurity.sector}</Text>:null}{securityPickerError?<Text style={ui.inputError}>{securityPickerError}</Text>:null}{!selectedSecurity && securityMatches.length?<View style={ui.securityList}>{securityMatches.map(x=><Pressable key={x.symbol} style={ui.securityChoice} onPress={()=>chooseSecurity(x)}><Text style={ui.securityChoiceTitle}>{x.symbol} — {x.name}</Text><Text style={ui.securityChoiceMeta}>{x.sector}</Text></Pressable>)}</View>:null}'''
if old not in s and 'placeholder="Search NSE security"' not in s: raise SystemExit('ERROR — free-text security field anchor missing')
s=s.replace(old,new,1)
# Remove duplicate accommodation explanation. Keep decision controls only; transcript already contains buildAccommodationDialogue.
pat=re.compile(r'''\{accommodation \? <View style=\{ui\.coach\}>\s*<Text style=\{ui\.eyebrow\}>COACH G — PORTFOLIO FIT</Text>.*?<View style=\{ui\.chipRow\}>\s*(<Pressable.*?</Pressable>\s*<Pressable.*?</Pressable>\s*<Pressable.*?</Pressable>)\s*</View>\s*</View> : null\}''',re.S)
m=pat.search(s)
if m:
    controls=m.group(1)
    s=s[:m.start()]+'{accommodation ? <View style={ui.chipRow}>'+controls+'</View> : null}'+s[m.end():]
elif 'COACH G — PORTFOLIO FIT' in s:
    raise SystemExit('ERROR — duplicate Portfolio Fit card could not be safely removed')
# hard block any unresolved sector just in case master entry itself is incomplete
needle2='    const security=getSecurityBySymbol(scenario.security);'
if needle2 in s and 'security?.sector === "Unknown"' not in s:
    s=s.replace(needle2,needle2+'\n    if(!security?.symbol || !security?.sector || security.sector === "Unknown") return null;',1)
p.write_text(s,encoding='utf-8')
print('UPDATED — security entry now uses the canonical NSE security master picker')
print('UPDATED — unresolved/mistyped security text cannot enter portfolio-fit simulation')
print('UPDATED — Coach G portfolio-fit explanation is rendered once in the conversation transcript')
PY
echo "PC-030M20AR6 applied successfully."
