#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"

echo "PC-030M20AU1 — Recovery Recommendation Selector Installer Correction"
[[ -f "$TRADING" ]] || { echo "ERROR — Trading screen not found: $TRADING"; exit 1; }

python - "$TRADING" <<'PY'
from pathlib import Path
import re, sys

p = Path(sys.argv[1])
original = p.read_text(encoding="utf-8")
s = original

IMPORT_LINE = 'import RecoveryRecommendationSelector from "../../src/components/coach/RecoveryRecommendationSelector";'
MARKER = "PC-030M20AU recommendation selector"

if MARKER in s and "<RecoveryRecommendationSelector" in s:
    print("NO CHANGE — PC-030M20AU is already installed.")
    raise SystemExit(0)

if IMPORT_LINE not in s:
    candidates = [s.find("export default function "), s.find("function DecisionLabHome"), s.find("const ")]
    candidates = [x for x in candidates if x >= 0]
    if not candidates:
        raise SystemExit("ERROR — safe import insertion boundary not found")
    pos = min(candidates)
    s = s[:pos] + IMPORT_LINE + "\n\n" + s[pos:]

if MARKER not in s:
    patterns = [
        re.compile(r'const\s+\[\s*conversationOpen\s*,\s*setConversationOpen\s*\]\s*=\s*useState\(\s*false\s*\)\s*;'),
        re.compile(r'const\s+\[\s*decisionConversationOpen\s*,\s*setDecisionConversationOpen\s*\]\s*=\s*useState\(\s*false\s*\)\s*;')
    ]
    state = next((pat.search(s) for pat in patterns if pat.search(s)), None)
    if not state:
        raise SystemExit("ERROR — floating conversation state anchor not found")
    addition = '\n  const [recoveryOwnWhatIf, setRecoveryOwnWhatIf] = useState(false); // PC-030M20AU recommendation selector'
    s = s[:state.end()] + addition + s[state.end():]

if "const recoveryRecommendationEntry" not in s:
    helper = '  const recoveryRecommendationEntry =\n    String(entryParams?.decisionSource || "").toUpperCase() === "COACH_G_RECOVERY";\n\n'
    anchors = ["  const baseline = useMemo(", "  const decisionBaseline = useMemo(", "  const conversation = ", "  function open"]
    anchor_pos = next((s.find(a) for a in anchors if s.find(a) >= 0), -1)
    if anchor_pos < 0:
        raise SystemExit("ERROR — Decision Lab recovery-entry insertion boundary not found")
    s = s[:anchor_pos] + helper + s[anchor_pos:]

if "<RecoveryRecommendationSelector" not in s:
    action = None
    for pat in [
        r'<Text\s+style=\{ui\.label\}>\s*Action\s*</Text>',
        r'<Text\s+style=\{styles\.label\}>\s*Action\s*</Text>',
        r'<Text[^>]*>\s*Action\s*</Text>'
    ]:
        action = re.search(pat, s, re.S)
        if action:
            break
    if not action:
        raise SystemExit("ERROR — structured form Action label not found")

    tail = s[action.end():]
    note_rel = None
    for pat in [
        r'<Text\s+style=\{ui\.label\}>\s*Anything else you want Coach G to know\?\s*</Text>',
        r'<Text\s+style=\{styles\.label\}>\s*Anything else you want Coach G to know\?\s*</Text>',
        r'<Text[^>]*>\s*Anything else you want Coach G to know\?\s*</Text>'
    ]:
        note_rel = re.search(pat, tail, re.S)
        if note_rel:
            break
    if not note_rel:
        raise SystemExit("ERROR — structured form notes label not found")

    notes_end = action.end() + note_rel.end()
    note_input = s.find("<TextInput", notes_end)
    if note_input < 0:
        raise SystemExit("ERROR — notes TextInput not found")
    note_end = s.find("/>", note_input)
    if note_end < 0:
        raise SystemExit("ERROR — notes TextInput closing '/>' not found")
    note_end += 2

    selector = '''        {recoveryRecommendationEntry && !recoveryOwnWhatIf ? (\n          <RecoveryRecommendationSelector\n            onCreateOwnWhatIf={() => setRecoveryOwnWhatIf(true)}\n          />\n        ) : null}\n\n        {(!recoveryRecommendationEntry || recoveryOwnWhatIf) ? (\n          <>\n'''
    s = s[:action.start()] + selector + s[action.start():]
    note_end += len(selector)
    s = s[:note_end] + '''\n          </>\n        ) : null}\n''' + s[note_end:]

s = s.replace(
    "What part of that recommendation would you like to test before deciding?",
    "I identified the recovery paths below from your current goal and portfolio evidence. Choose one to explore, compare them, or create your own what-if."
)

required = [IMPORT_LINE, MARKER, "const recoveryRecommendationEntry", "<RecoveryRecommendationSelector", "recoveryOwnWhatIf"]
missing = [item for item in required if item not in s]
if missing:
    raise SystemExit(f"ERROR — installer safety assertion failed: {missing}")

if s != original:
    backup = p.with_suffix(p.suffix + ".pc030m20au1.bak")
    backup.write_text(original, encoding="utf-8")
    p.write_text(s, encoding="utf-8")
    print("UPDATED — recovery recommendation selector connected to Trading.")
    print("UPDATED — M20AU import-parser defect corrected.")
    print("PRESERVED — original form remains available through Create my own what-if.")
    print("PRESERVED — Floating Coach, FIFO, Goal/Risk and Broker Action Plan boundaries.")
else:
    print("NO CHANGE — PC-030M20AU already present.")

print("PC-030M20AU1 applied successfully.")
PY
