#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLOATING="$ROOT/mobile/src/components/coach/FloatingCoachG.js"
SELECTOR="$ROOT/mobile/src/components/coach/RecoveryRecommendationSelector.js"
echo "PC-030M20AU4 — Selected Recovery → Floating Coach Activation"
[[ -f "$FLOATING" ]] || { echo "ERROR — canonical FloatingCoachG.js missing"; exit 1; }
[[ -f "$SELECTOR" ]] || { echo "ERROR — M20AU3 selector missing"; exit 1; }
python - "$FLOATING" "$SELECTOR" <<'PY'
from pathlib import Path
import re, sys
floating = Path(sys.argv[1])
selector = Path(sys.argv[2])
fs = floating.read_text(encoding="utf-8")
ss = selector.read_text(encoding="utf-8")
floating_import = 'import { subscribeFloatingCoachGOpen } from "../../features/trading/floatingCoachGActivationService";'
selector_import = 'import { requestFloatingCoachGOpen } from "../../features/trading/floatingCoachGActivationService";'

if floating_import not in fs:
    imports = list(re.finditer(r"^import[\\s\\S]*?;\\s*$", fs, re.M))
    pos = imports[-1].end() if imports else 0
    fs = fs[:pos] + "\n" + floating_import + fs[pos:]

if "PC-030M20AU4 floating activation subscription" not in fs:
    open_state = re.search(r"const\\s+\\[open,\\s*setOpen\\]\\s*=\\s*useState\\(false\\);", fs)
    if not open_state:
        raise SystemExit("ERROR — canonical FloatingCoachG open state not found")
    subscription = "\n  // PC-030M20AU4 floating activation subscription\n  React.useEffect(() => {\n    return subscribeFloatingCoachGOpen((request) => {\n      if (request?.question && typeof setQuestion === \"function\") {\n        setQuestion(request.question);\n      }\n      setOpen(true);\n    });\n  }, []);\n"
    fs = fs[:open_state.end()] + subscription + fs[open_state.end():]

if selector_import not in ss:
    imports = list(re.finditer(r"^import[\\s\\S]*?;\\s*$", ss, re.M))
    pos = imports[-1].end() if imports else 0
    ss = ss[:pos] + "\n" + selector_import + ss[pos:]

if "PC-030M20AU4 activate canonical Floating Coach" not in ss:
    target = "    startDecisionConversation({\n      scenario: seed.scenario,\n      openingText:\n        selectedCoachResponse?.answer ||\n        seed.openingText,\n      openingQuestion:\n        selectedCoachResponse?.question ||\n        seed.openingQuestion\n    });"
    if target not in ss:
        raise SystemExit("ERROR — M20AU3 continueWithCoach session-start block not found")
    activation = "\n\n    // PC-030M20AU4 activate canonical Floating Coach\n    requestFloatingCoachGOpen({\n      source: \"RECOVERY_RECOMMENDATION\",\n      question:\n        selectedCoachResponse?.question ||\n        seed.openingQuestion,\n      context: {\n        scenarioId: selectedChoice?.id || null,\n        strategy: selectedChoice?.strategy || null,\n        goalName: result?.goalName || goalName || null\n      }\n    });"
    ss = ss.replace(target, target + activation, 1)

required_f = [floating_import, "PC-030M20AU4 floating activation subscription", "setOpen(true)"]
required_s = [selector_import, "PC-030M20AU4 activate canonical Floating Coach", "requestFloatingCoachGOpen"]
if any(x not in fs for x in required_f):
    raise SystemExit("ERROR — FloatingCoachG AU4 validation failed")
if any(x not in ss for x in required_s):
    raise SystemExit("ERROR — Recovery selector AU4 validation failed")
floating.write_text(fs, encoding="utf-8")
selector.write_text(ss, encoding="utf-8")
print("UPDATED — canonical Floating Coach listens for explicit activation requests.")
print("UPDATED — Answer Coach G starts the session and opens the canonical Floating Coach.")
print("UPDATED — selected option question is prefilled into the Floating Coach reply surface.")
print("PRESERVED — M20AU3 selected-option response and no-mutation boundaries.")
print("PC-030M20AU4 applied successfully.")
PY
