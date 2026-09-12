#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"
echo "PC-030M20AU2 — DecisionLabHome-anchored installer correction"
[[ -f "$TRADING" ]] || { echo "ERROR — Trading screen not found"; exit 1; }
python - "$TRADING" <<'PY'
from pathlib import Path
import re, sys
p = Path(sys.argv[1])
original = p.read_text(encoding="utf-8")
s = original
IMPORT = 'import RecoveryRecommendationSelector from "../../src/components/coach/RecoveryRecommendationSelector";'
MARKER = "PC-030M20AU recommendation selector"

# 1. Import at top-level without parsing the existing import block.
if IMPORT not in s:
    s = IMPORT + "\n" + s

# 2. Add state directly inside DecisionLabHome; no conversation-state anchor needed.
if MARKER not in s:
    home = re.search(r"function\s+DecisionLabHome\s*\([^)]*\)\s*\{", s, re.S)
    if not home:
        raise SystemExit("ERROR — DecisionLabHome function boundary not found; no file changes written")
    state = "\n  const [recoveryOwnWhatIf, setRecoveryOwnWhatIf] = useState(false); // PC-030M20AU recommendation selector\n"
    s = s[:home.end()] + state + s[home.end():]

# 3. Derive recovery-entry mode from preserved entryParams.
if "const recoveryRecommendationEntry" not in s:
    marker_pos = s.find(MARKER)
    if marker_pos < 0:
        raise SystemExit("ERROR — AU state marker missing")
    line_end = s.find("\n", marker_pos)
    helper = "\n  const recoveryRecommendationEntry =\n    String(entryParams?.decisionSource || \"\").toUpperCase() === \"COACH_G_RECOVERY\";\n"
    s = s[:line_end+1] + helper + s[line_end+1:]

# 4. Put selector before existing Action form and keep form behind Create my own what-if.
if "<RecoveryRecommendationSelector" not in s:
    home_start = s.find("function DecisionLabHome")
    action_pos = -1
    for candidate in [
        "<Text style={ui.label}>Action</Text>",
        "<Text style={styles.label}>Action</Text>",
    ]:
        action_pos = s.find(candidate, home_start)
        if action_pos >= 0:
            break
    if action_pos < 0:
        m = re.search(r"<Text[^>]*>\s*Action\s*</Text>", s[home_start:], re.S)
        if m:
            action_pos = home_start + m.start()
    if action_pos < 0:
        raise SystemExit("ERROR — DecisionLabHome Action label not found; no file changes written")

    notes_pos = s.find("Anything else you want Coach G to know?", action_pos)
    if notes_pos < 0:
        raise SystemExit("ERROR — DecisionLabHome notes label not found; no file changes written")
    input_pos = s.find("<TextInput", notes_pos)
    if input_pos < 0:
        raise SystemExit("ERROR — notes TextInput not found; no file changes written")
    input_close = s.find("/>", input_pos)
    if input_close < 0:
        raise SystemExit("ERROR — notes TextInput closing not found; no file changes written")
    input_close += 2

    selector_open = (
        "{recoveryRecommendationEntry && !recoveryOwnWhatIf ? (\n"
        "          <RecoveryRecommendationSelector\n"
        "            onCreateOwnWhatIf={() => setRecoveryOwnWhatIf(true)}\n"
        "          />\n"
        "        ) : null}\n\n"
        "        {(!recoveryRecommendationEntry || recoveryOwnWhatIf) ? (\n"
        "          <>\n        "
    )
    s = s[:action_pos] + selector_open + s[action_pos:]
    input_close += len(selector_open)
    selector_close = "\n          </>\n        ) : null}\n        "
    s = s[:input_close] + selector_close + s[input_close:]

# 5. Clarify old recovery wording if present.
s = s.replace(
    "What part of that recommendation would you like to test before deciding?",
    "I identified the recovery paths below from your current goal and portfolio evidence. Choose one to explore, compare them, or create your own what-if."
)

# 6. Safety validation before write.
required = [IMPORT, MARKER, "const recoveryRecommendationEntry", "<RecoveryRecommendationSelector", "recoveryOwnWhatIf"]
missing = [x for x in required if x not in s]
if missing:
    raise SystemExit("ERROR — AU2 safety validation failed: " + ", ".join(missing))
home_pos = s.find("function DecisionLabHome")
state_pos = s.find(MARKER, home_pos)
selector_pos = s.find("<RecoveryRecommendationSelector", home_pos)
if home_pos < 0 or state_pos < home_pos or selector_pos < home_pos:
    raise SystemExit("ERROR — AU2 scope validation failed; no file changes written")

if s != original:
    backup = p.with_suffix(p.suffix + ".pc030m20au2.bak")
    backup.write_text(original, encoding="utf-8")
    p.write_text(s, encoding="utf-8")

print("UPDATED — AU state is anchored directly inside DecisionLabHome.")
print("UPDATED — recovery entry is recommendation-first.")
print("PRESERVED — structured form remains behind Create my own what-if.")
print("PRESERVED — existing Floating Coach and simulation flow remain downstream.")
print("PC-030M20AU2 applied successfully.")
PY
