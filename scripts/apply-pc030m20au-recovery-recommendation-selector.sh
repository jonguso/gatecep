#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"

echo "PC-030M20AU — Recovery Recommendation Selection"
[[ -f "$TRADING" ]] || { echo "ERROR — Trading screen not found"; exit 1; }

python - "$TRADING" <<'PY'
from pathlib import Path
import re,sys

p=Path(sys.argv[1])
s=p.read_text(encoding="utf-8")

if "PC-030M20AU recommendation selector" in s:
    print("NO CHANGE — M20AU already installed")
    raise SystemExit(0)

# Import the selector.
imports=list(re.finditer(r'^import\\s+.*?;\\s*$',s,re.M|re.S))
if not imports:
    raise SystemExit("ERROR — import block not found")
pos=imports[-1].end()
s=s[:pos]+'\\nimport RecoveryRecommendationSelector from "../../src/components/coach/RecoveryRecommendationSelector";'+s[pos:]

# Add state beside the conversation state.
state_re=re.compile(r'const\\s+\\[conversationOpen,\\s*setConversationOpen\\]\\s*=\\s*useState\\(false\\);')
m=state_re.search(s)
if not m:
    raise SystemExit("ERROR — conversationOpen state anchor not found")
s=s[:m.end()]+'\\n  const [recoveryOwnWhatIf, setRecoveryOwnWhatIf] = useState(false); // PC-030M20AU recommendation selector'+s[m.end():]

# M20AR5+ passes entryParams into DecisionLabHome. Derive recovery entry from that contract.
insert_anchor='  const baseline = useMemo('
helper='''  const recoveryRecommendationEntry =
    String(entryParams?.decisionSource || "").toUpperCase() === "COACH_G_RECOVERY";

'''
if insert_anchor in s:
    s=s.replace(insert_anchor,helper+insert_anchor,1)
else:
    # Safe fallback: place before first function after state declarations.
    idx=s.find("  function ")
    if idx<0:
        raise SystemExit("ERROR — Decision Lab helper insertion point not found")
    s=s[:idx]+helper+s[idx:]

# Locate the structured form boundaries.
action=re.search(r'<Text\\s+style=\\{ui\\.label\\}>\\s*Action\\s*</Text>',s,re.S)
notes=re.search(r'<Text\\s+style=\\{ui\\.label\\}>\\s*Anything else you want Coach G to know\\?\\s*</Text>',s,re.S)
if not action or not notes or notes.start()<=action.start():
    raise SystemExit("ERROR — structured recovery form boundaries not found; refusing unsafe UI rewrite")

note_input=s.find("<TextInput",notes.end())
if note_input<0:
    raise SystemExit("ERROR — notes TextInput not found")
note_end=s.find("/>",note_input)
if note_end<0:
    raise SystemExit("ERROR — notes TextInput close not found")
note_end+=2

selector='''        {recoveryRecommendationEntry && !recoveryOwnWhatIf ? (
          <RecoveryRecommendationSelector
            onCreateOwnWhatIf={() => setRecoveryOwnWhatIf(true)}
          />
        ) : null}

        {(!recoveryRecommendationEntry || recoveryOwnWhatIf) ? (
          <>
'''
s=s[:action.start()]+selector+s[action.start():]
note_end += len(selector)
s=s[:note_end] + '''
          </>
        ) : null}
''' + s[note_end:]

# Clarify the recovery intro if the stale question is still present.
s=s.replace(
    "What part of that recommendation would you like to test before deciding?",
    "I identified the recovery paths below from your current goal and portfolio evidence. Choose one to explore, compare them, or create your own what-if.",
    1
)

p.write_text(s,encoding="utf-8")
print("UPDATED — recovery entry is recommendation-first instead of form-first.")
print("UPDATED — evidence-backed Wealth Journey scenarios are selectable.")
print("PRESERVED — original structured form remains behind Create my own what-if.")
print("PRESERVED — selected option opens the existing Floating Coach discussion.")
PY

echo "PC-030M20AU applied successfully."
