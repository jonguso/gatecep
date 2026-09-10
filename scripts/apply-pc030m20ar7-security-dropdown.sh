#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILE="$ROOT/mobile/app/(tabs)/trading.js"
[ -f "$FILE" ] || { echo "ERROR — $FILE not found"; exit 1; }
python3 - "$FILE" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text(encoding="utf-8")
if 'PC-030M20AR7 canonical NSE dropdown' in s:
    print('NO CHANGE — M20AR7 dropdown already installed')
    raise SystemExit(0)
anchor='  const [securityPickerError, setSecurityPickerError] = React.useState("");\n'
if anchor not in s:
    raise SystemExit('ERROR — M20AR6 security-picker state anchor not found; refusing unsafe patch')
s=s.replace(anchor, anchor+'  const [securityDropdownOpen, setSecurityDropdownOpen] = React.useState(false); // PC-030M20AR7 canonical NSE dropdown\n',1)
old='''  function chooseSecurity(security) {\n    setIdeaSymbol(String(security?.symbol||"").toUpperCase());\n    setSecurityQuery(`${security?.symbol || ""} — ${security?.name || ""}`);\n    setSecurityPickerError("");\n    setCoachTurn(null); setAccommodation(null); setShowAlternatives(false);\n  }\n  function changeSecurityQuery(value) {\n    setSecurityQuery(value); setIdeaSymbol(""); setSecurityPickerError("");\n    setCoachTurn(null); setAccommodation(null); setShowAlternatives(false);\n  }\n'''
new='''  function chooseSecurity(security) {\n    setIdeaSymbol(String(security?.symbol||"").toUpperCase());\n    setSecurityQuery("");\n    setSecurityPickerError("");\n    setSecurityDropdownOpen(false);\n    setCoachTurn(null); setAccommodation(null); setShowAlternatives(false);\n  }\n  function changeSecurityQuery(value) {\n    setSecurityQuery(value);\n    setSecurityPickerError("");\n  }\n  function toggleSecurityDropdown() {\n    setSecurityDropdownOpen(open => !open);\n    setSecurityQuery("");\n    setSecurityPickerError("");\n  }\n'''
if old not in s:
    raise SystemExit('ERROR — M20AR6 choose/change security functions not found; refusing unsafe patch')
s=s.replace(old,new,1)
# Ensure opening a new dialogue resets dropdown too.
s=s.replace('setIdeaSymbol(""); setSecurityQuery(""); setSecurityPickerError("");','setIdeaSymbol(""); setSecurityQuery(""); setSecurityPickerError(""); setSecurityDropdownOpen(false);',1)
old_ui='''      <Text style={[ui.body,{marginTop:12}]}>Security (optional for open what-if)</Text><TextInput value={securityQuery} onChangeText={changeSecurityQuery} autoCapitalize="characters" placeholder="Search NSE security" placeholderTextColor="#64748b" style={ui.input}/>{selectedSecurity?<Text style={ui.securitySelected}>Selected: {selectedSecurity.symbol} — {selectedSecurity.name} • {selectedSecurity.sector}</Text>:null}{securityPickerError?<Text style={ui.inputError}>{securityPickerError}</Text>:null}{!selectedSecurity && securityMatches.length?<View style={ui.securityList}>{securityMatches.map(x=><Pressable key={x.symbol} style={ui.securityChoice} onPress={()=>chooseSecurity(x)}><Text style={ui.securityChoiceTitle}>{x.symbol} — {x.name}</Text><Text style={ui.securityChoiceMeta}>{x.sector}</Text></Pressable>)}</View>:null}\n'''
new_ui='''      <Text style={[ui.body,{marginTop:12}]}>Security (optional for open what-if)</Text>\n      <Pressable accessibilityRole="button" accessibilityLabel="Select NSE security" onPress={toggleSecurityDropdown} style={[ui.input,{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}]}>\n        <Text style={{color:selectedSecurity?"#fff":"#94a3b8",fontWeight:selectedSecurity?"800":"500",flex:1}}>{selectedSecurity ? `${selectedSecurity.symbol} — ${selectedSecurity.name}` : "Select NSE security"}</Text>\n        <Text style={{color:"#67e8f9",fontWeight:"900",marginLeft:10}}>{securityDropdownOpen ? "▲" : "▼"}</Text>\n      </Pressable>\n      {selectedSecurity?<Text style={ui.securitySelected}>{selectedSecurity.sector} • Canonical symbol: {selectedSecurity.symbol}</Text>:null}\n      {securityDropdownOpen?<View style={ui.securityList}>\n        <View style={{padding:8,backgroundColor:"#071426"}}><TextInput value={securityQuery} onChangeText={changeSecurityQuery} autoCapitalize="characters" autoFocus placeholder="Search symbol or company name" placeholderTextColor="#64748b" style={ui.input}/></View>\n        {(securityQuery.trim()?securityMatches:NSE_SECURITIES.slice(0,12)).map(x=><Pressable key={x.symbol} style={ui.securityChoice} onPress={()=>chooseSecurity(x)}><Text style={ui.securityChoiceTitle}>{x.symbol} — {x.name}</Text><Text style={ui.securityChoiceMeta}>{x.sector}</Text></Pressable>)}\n        {securityQuery.trim() && !securityMatches.length?<Text style={[ui.note,{padding:10}]}>No matching NSE security. Try the symbol or company name.</Text>:null}\n      </View>:null}\n      {securityPickerError?<Text style={ui.inputError}>{securityPickerError}</Text>:null}\n'''
if old_ui not in s:
    raise SystemExit('ERROR — M20AR6 investor-facing security picker markup not found; refusing unsafe patch')
s=s.replace(old_ui,new_ui,1)
p.write_text(s, encoding="utf-8")
print('UPDATED — Security is now selected from a searchable canonical NSE dropdown')
print('PRESERVED — search text is filter-only and cannot become scenario identity')
PY

echo "PC-030M20AR7 applied successfully."
