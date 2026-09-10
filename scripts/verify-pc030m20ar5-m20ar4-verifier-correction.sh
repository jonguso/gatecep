#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
echo "PC-030M20AR5 — M20AR4 Decision Lab Render Regression Correction"
FILE="$ROOT/mobile/app/(tabs)/trading.js"
[[ -f "$FILE" ]] || { echo "FAIL — Trading route missing"; exit 1; }
grep -q 'entryParams={entryParams}' "$FILE" || { echo "FAIL — M20AR4 entry-context DecisionLab render missing"; exit 1; }
grep -q 'dialogueTurns.map' "$FILE" || { echo "FAIL — M20AR4 investor/Coach G transcript missing"; exit 1; }
echo "PASS — M20AR4 DecisionLabHome render keeps entry context."
echo "PASS — investor/Coach G dialogue layer remains installed."
echo "Re-running corrected M20AQ3 regression..."
bash scripts/verify-pc030m20aq3-trading-ui-consolidation.sh
echo "PC-030M20AR5 verification complete."
