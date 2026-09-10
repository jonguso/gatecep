#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SESSION="$ROOT/mobile/src/features/trading/coachGDecisionConversationSession.js"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"

echo "PC-030M20AT1 — Answerable Discovery Question Guard"

[[ -f "$SESSION" && -f "$TRADING" ]] || { echo "ERROR — M20AT files missing"; exit 1; }

python - "$SESSION" "$TRADING" <<'PY'
from pathlib import Path
import sys
session,trading=map(Path,sys.argv[1:])

s=session.read_text(encoding="utf-8")
if "PC-030M20AT1 answerable question guard" not in s:
    old='export function startDecisionConversation({scenario,openingText="",openingQuestion=""}={}){\n  const q=clean(openingQuestion)||(["SELL","REDUCE"].includes(upper(scenario?.action))?"What would you like the released cash to accomplish?":"What outcome would make this idea worthwhile for you?");'
    new='export function startDecisionConversation({scenario,openingText="",openingQuestion=""}={}){\n  // PC-030M20AT1 answerable question guard\n  const supplied=clean(openingQuestion);\n  const suppliedIsQuestion=supplied.endsWith("?") && supplied.length > 4;\n  const q=suppliedIsQuestion\n    ? supplied\n    : (["SELL","REDUCE"].includes(upper(scenario?.action))\n        ? "What would you like the released cash to accomplish?"\n        : "What outcome would make this idea worthwhile for you?");'
    if old not in s:
        raise SystemExit("ERROR — M20AT session start anchor not found; refusing unsafe patch")
    s=s.replace(old,new,1)
    session.write_text(s,encoding="utf-8")
    print("UPDATED — Floating Coach discovery always ends with an answerable question.")
else:
    print("SKIP — session guard already installed")

t=trading.read_text(encoding="utf-8")
if "PC-030M20AT1 normalize handoff question" not in t:
    old='    startDecisionConversation({scenario,openingText:conversation.opening,openingQuestion:conversation.nextQuestion});'
    new='    // PC-030M20AT1 normalize handoff question\n    const handoffQuestion =\n      String(conversation?.nextQuestion || "").trim().endsWith("?")\n        ? conversation.nextQuestion\n        : "";\n    startDecisionConversation({scenario,openingText:conversation.opening,openingQuestion:handoffQuestion});'
    if old not in t:
        raise SystemExit("ERROR — M20AT Trading handoff anchor not found; refusing unsafe patch")
    t=t.replace(old,new,1)
    trading.write_text(t,encoding="utf-8")
    print("UPDATED — status/explanation text from the old dialogue cannot masquerade as the floating question.")
else:
    print("SKIP — Trading handoff guard already installed")
PY

echo "PC-030M20AT1 applied successfully."
