#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLOATING="$ROOT/mobile/src/components/coach/FloatingCoachG.js"
SELECTOR="$ROOT/mobile/src/components/coach/RecoveryRecommendationSelector.js"

echo "PC-030M20AU4A — Runtime-State-Aware Floating Coach Activation"
[[ -f "$FLOATING" ]] || { echo "ERROR — canonical FloatingCoachG.js missing"; exit 1; }
[[ -f "$SELECTOR" ]] || { echo "ERROR — M20AU3 selector missing"; exit 1; }

python - "$FLOATING" "$SELECTOR" <<'PY'
from pathlib import Path
import re, sys

floating = Path(sys.argv[1])
selector = Path(sys.argv[2])
fs = floating.read_text(encoding="utf-8")
ss = selector.read_text(encoding="utf-8")

f_import = 'import { subscribeFloatingCoachGOpen } from "../../features/trading/floatingCoachGActivationService";'
s_import = 'import { requestFloatingCoachGOpen } from "../../features/trading/floatingCoachGActivationService";'

def add_import(text, line):
    if line in text:
        return text
    imports = list(re.finditer(r"^import[\\s\\S]*?;\\s*$", text, re.M))
    if imports:
        pos = imports[-1].end()
        return text[:pos] + "\\n" + line + text[pos:]
    return line + "\\n" + text

# Find FloatingCoachG component without assuming visibility-state name.
fm = re.search(r"export\\s+default\\s+function\\s+FloatingCoachG\\s*\\([^)]*\\)\\s*\\{", fs)
if not fm:
    fm = re.search(r"function\\s+FloatingCoachG\\s*\\([^)]*\\)\\s*\\{", fs)
if not fm:
    raise SystemExit("ERROR — FloatingCoachG component boundary not found")

component_start = fm.end()
component_text = fs[component_start:]
state_matches = list(re.finditer(
    r"const\\s+\\[\\s*(\\w+)\\s*,\\s*(\\w+)\\s*\\]\\s*=\\s*(?:React\\.)?useState\\(\\s*(false|true)\\s*\\)\\s*;",
    component_text
))
if not state_matches:
    raise SystemExit("ERROR — no boolean state declaration found inside FloatingCoachG")

visible_name = None
visible_setter = None
question_setter = None

for sm in state_matches:
    state, setter = sm.group(1), sm.group(2)
    if re.search(r"<Modal[^>]*\\bvisible\\s*=\\s*\\{\\s*" + re.escape(state) + r"\\s*\\}", component_text, re.S):
        visible_name, visible_setter = state, setter
        break

if visible_name is None:
    for sm in state_matches:
        state, setter = sm.group(1), sm.group(2)
        if re.search(r"\\{\\s*" + re.escape(state) + r"\\s*&&", component_text):
            visible_name, visible_setter = state, setter
            break

if visible_name is None:
    for sm in state_matches:
        state, setter = sm.group(1), sm.group(2)
        if re.search(re.escape(setter) + r"\\(\\s*true\\s*\\)", component_text):
            visible_name, visible_setter = state, setter
            break

if visible_name is None:
    discovered = ", ".join(f"{m.group(1)}/{m.group(2)}" for m in state_matches)
    raise SystemExit("ERROR — could not identify visibility state. Found: " + discovered)

qm = re.search(
    r"const\\s+\\[\\s*(question|input|message|draft|prompt)\\s*,\\s*(\\w+)\\s*\\]\\s*=\\s*(?:React\\.)?useState\\(",
    component_text, re.I
)
if qm:
    question_setter = qm.group(2)

fs = add_import(fs, f_import)
ss = add_import(ss, s_import)

# Re-find component/state after import insertion.
fm = re.search(r"export\\s+default\\s+function\\s+FloatingCoachG\\s*\\([^)]*\\)\\s*\\{", fs)
if not fm:
    fm = re.search(r"function\\s+FloatingCoachG\\s*\\([^)]*\\)\\s*\\{", fs)
component_start = fm.end()
component_text = fs[component_start:]
state_re = re.compile(
    r"const\\s+\\[\\s*" + re.escape(visible_name) + r"\\s*,\\s*" + re.escape(visible_setter) +
    r"\\s*\\]\\s*=\\s*(?:React\\.)?useState\\(\\s*(?:false|true)\\s*\\)\\s*;"
)
sm = state_re.search(component_text)
if not sm:
    raise SystemExit("ERROR — visibility state not found after import insertion")
state_abs_end = component_start + sm.end()

if "PC-030M20AU4A runtime-state-aware activation" not in fs:
    sub = "\\n  // PC-030M20AU4A runtime-state-aware activation\\n"
    sub += "  React.useEffect(() => {\\n"
    sub += "    return subscribeFloatingCoachGOpen((request) => {\\n"
    if question_setter:
        sub += "      if (request?.question) {\\n"
        sub += f"        {question_setter}(request.question);\\n"
        sub += "      }\\n"
    sub += f"      {visible_setter}(true);\\n"
    sub += "    });\\n"
    sub += "  }, []);\\n"
    fs = fs[:state_abs_end] + sub + fs[state_abs_end:]

if "PC-030M20AU4A activate canonical Floating Coach" not in ss:
    target = (
        "    startDecisionConversation({\\n"
        "      scenario: seed.scenario,\\n"
        "      openingText:\\n"
        "        selectedCoachResponse?.answer ||\\n"
        "        seed.openingText,\\n"
        "      openingQuestion:\\n"
        "        selectedCoachResponse?.question ||\\n"
        "        seed.openingQuestion\\n"
        "    });"
    )
    if target not in ss:
        raise SystemExit("ERROR — M20AU3 continueWithCoach session-start block not found")

    activation = (
        "\\n\\n    // PC-030M20AU4A activate canonical Floating Coach\\n"
        "    requestFloatingCoachGOpen({\\n"
        "      source: \\"RECOVERY_RECOMMENDATION\\",\\n"
        "      question:\\n"
        "        selectedCoachResponse?.question ||\\n"
        "        seed.openingQuestion,\\n"
        "      context: {\\n"
        "        scenarioId: selectedChoice?.id || null,\\n"
        "        strategy: selectedChoice?.strategy || null,\\n"
        "        goalName: result?.goalName || goalName || null\\n"
        "      }\\n"
        "    });"
    )
    ss = ss.replace(target, target + activation, 1)

if f_import not in fs or "PC-030M20AU4A runtime-state-aware activation" not in fs:
    raise SystemExit("ERROR — FloatingCoachG AU4A validation failed")
if s_import not in ss or "PC-030M20AU4A activate canonical Floating Coach" not in ss:
    raise SystemExit("ERROR — Recovery selector AU4A validation failed")

floating.write_text(fs, encoding="utf-8")
selector.write_text(ss, encoding="utf-8")

print(f"DETECTED — Floating Coach visibility state: {visible_name} via {visible_setter}.")
print("DETECTED — question setter: " + (question_setter or "not available"))
print("UPDATED — canonical Floating Coach listens for recovery activation requests.")
print("UPDATED — Answer Coach G opens the actual current Floating Coach state.")
print("PRESERVED — existing M20AT conversation session remains authoritative.")
print("PC-030M20AU4A applied successfully.")
PY
