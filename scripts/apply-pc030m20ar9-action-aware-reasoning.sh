#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"
[[ -f "$TRADING" ]] || { echo "ERROR — Trading screen missing"; exit 1; }
echo "PC-030M20AR9 — Action-Aware Coach G Decision Reasoning"
python3 - "$TRADING" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text(encoding='utf-8')
if 'coachGDecisionAccommodationService' not in s or 'buildAccommodationDialogue' not in s:
    raise SystemExit('ERROR — M20AR3/M20AR4 reasoning layers missing; refusing unsafe patch')
if 'PC-030M20AR9 action-aware controls' in s:
    print('NO CHANGE — M20AR9 Trading controls already installed')
    raise SystemExit(0)
# Action-aware button labels. Existing behavior remains: options continue discussion; original continues detailed simulation.
s=s.replace('<Text style={ui.chipText}>Yes — show me options</Text>', '<Text style={ui.chipText}>{accommodation?.isSell ? "Explore released cash" : "Yes — show me options"}</Text>',1)
s=s.replace('<Text style={ui.chipText}>Keep original idea</Text>', '<Text style={ui.chipText}>{accommodation?.isSell ? "Keep original reduction" : "Keep original idea"}</Text>',1)
s=s.replace('<Text style={ui.chipText}>Compare alternatives</Text>', '<Text style={ui.chipText}>{accommodation?.isSell ? "Compare uses of cash" : "Compare alternatives"}</Text>',1)
# Action-aware alternative panel title.
s=s.replace('<Text style={ui.cardTitle}>Ways Coach G can accommodate the idea</Text>', '<Text style={ui.cardTitle}>{accommodation?.isSell ? "Ways Coach G can use the released cash" : "Ways Coach G can accommodate the idea"}</Text>',1)
# BUY-only same-sector rotation candidate block. SELL never silently selects another sale/funding source.
old='''        {accommodation.rotationCandidates.length ? <><Text style={ui.note}>Same-sector funding candidates come from your current holdings. Coach G will not choose one for you.</Text>{accommodation.rotationCandidates.slice(0,4).map(x=><Pressable key={x.symbol} style={ui.link} onPress={()=>router.push({pathname:"/trade",params:{mode:"AVERAGE_COST",side:"SELL",symbol:x.symbol,decisionLab:"1",decisionSource:"ACCOMMODATE_SECURITY",fundTarget:accommodation.symbol,proposedAmount:String(accommodation.amount)}})}><Text style={ui.linkText}>Explore reducing {x.symbol} → fund {accommodation.symbol}</Text></Pressable>)}</> : <Text style={ui.note}>No current holding in {accommodation.sector} can be offered as a rotation candidate.</Text>}'''
new='''        {!accommodation.isSell ? (accommodation.rotationCandidates.length ? <><Text style={ui.note}>Same-sector funding candidates come from your current holdings. Coach G will not choose one for you.</Text>{accommodation.rotationCandidates.slice(0,4).map(x=><Pressable key={x.symbol} style={ui.link} onPress={()=>router.push({pathname:"/trade",params:{mode:"AVERAGE_COST",side:"SELL",symbol:x.symbol,decisionLab:"1",decisionSource:"ACCOMMODATE_SECURITY",fundTarget:accommodation.symbol,proposedAmount:String(accommodation.amount)}})}><Text style={ui.linkText}>Explore reducing {x.symbol} → fund {accommodation.symbol}</Text></Pressable>)}</> : <Text style={ui.note}>No current holding in {accommodation.sector} can be offered as a rotation candidate.</Text>) : <Text style={ui.note}>Detailed realized proceeds, remaining WAP and realized gain/loss are confirmed in the detailed SELL simulation using the existing FIFO evidence. This preliminary conversation does not invent those values.</Text>}'''
if old not in s:
    raise SystemExit('ERROR — M20AR3 rotation-candidate render anchor missing; refusing unsafe patch')
s=s.replace(old,new,1)
# The smaller-position shortcut is BUY accommodation only. SELL already has Continue to Simulation and should not be routed as a BUY-style reduced amount.
old2='''        <Pressable style={ui.link} onPress={()=>router.push({pathname:"/trade",params:{mode:"AVERAGE_COST",side:ideaSide,decisionLab:"1",decisionSource:"REDUCED_AMOUNT",symbol:accommodation.symbol,decisionAmount:String(Math.min(accommodation.amount, accommodation.sectorImpact.maxAdditionalBeforeSectorGuard || accommodation.amount))}})}><Text style={ui.linkText}>Test a smaller {accommodation.symbol} amount</Text></Pressable>'''
new2='''        {!accommodation.isSell ? <Pressable style={ui.link} onPress={()=>router.push({pathname:"/trade",params:{mode:"AVERAGE_COST",side:ideaSide,decisionLab:"1",decisionSource:"REDUCED_AMOUNT",symbol:accommodation.symbol,decisionAmount:String(Math.min(accommodation.amount, accommodation.sectorImpact.maxAdditionalBeforeSectorGuard || accommodation.amount))}})}><Text style={ui.linkText}>Test a smaller {accommodation.symbol} amount</Text></Pressable> : null}'''
if old2 not in s:
    raise SystemExit('ERROR — reduced-amount render anchor missing; refusing unsafe patch')
s=s.replace(old2,new2,1)
# Marker for idempotence and verification.
s=s.replace('function DecisionLabHome({ data, entryParams }) {','function DecisionLabHome({ data, entryParams }) { // PC-030M20AR9 action-aware controls',1)
p.write_text(s,encoding='utf-8')
print('UPDATED — BUY/ADD and SELL/REDUCE now use distinct Coach G discussion paths')
print('UPDATED — SELL asks about released cash and reduction impact instead of BUY accommodation')
print('PRESERVED — detailed SELL WAP/cost/P&L remains delegated to existing FIFO-aware Trade Lab')
PY
echo "PC-030M20AR9 applied successfully."
