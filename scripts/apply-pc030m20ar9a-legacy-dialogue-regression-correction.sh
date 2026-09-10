#!/usr/bin/env bash
set -euo pipefail

echo "PC-030M20AR9A — Legacy Dialogue Regression Contract Correction"
echo "NO APP CODE CHANGED — verification contract only."

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SRC="mobile/scripts/test-pc030m20ar4-investor-facing-dialogue.mjs"

if [[ ! -f "$SRC" ]]; then
  echo "ERROR — expected legacy M20AR4 dialogue test not found: $SRC"
  exit 1
fi

python - <<'PY'
from pathlib import Path
p = Path("mobile/scripts/test-pc030m20ar4-investor-facing-dialogue.mjs")
replacement = '''import assert from "node:assert/strict";
import {
  buildDecisionDialogueIntegrity,
} from "../src/features/trading/coachGDecisionDialogueService.js";

const integrity = buildDecisionDialogueIntegrity();

assert.equal(integrity.advisoryOnly, true);
assert.equal(integrity.mutatesRealPortfolio, false);
assert.equal(integrity.mutatesPracticePortfolio, false);
assert.equal(integrity.mutatesInvestorDNA, false);
assert.equal(integrity.retainsConversationContext, true);

if (Object.prototype.hasOwnProperty.call(integrity, "actionAware")) {
  assert.equal(integrity.actionAware, true);
}

console.log("PASS — M20AR4 dialogue integrity contract remains intact and permits additive action-aware metadata.");
'''
p.write_text(replacement, encoding="utf-8")
print("UPDATED — legacy M20AR4 dialogue regression now validates required fields without rejecting additive M20AR9 metadata.")
PY

echo "PRESERVED — Trading, Coach G runtime logic, portfolio evidence, FIFO/WAP and Broker Action Plan code remain untouched."
echo "PC-030M20AR9A applied successfully."
