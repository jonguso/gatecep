#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="$ROOT/scripts/verify-pc030m20aq3-trading-ui-consolidation.sh"
SOURCE="$SRC_DIR/verify-pc030m20aq3-trading-ui-consolidation.sh"

echo "PC-030M20AR5 — M20AR4 Decision Lab Render Regression Correction"
[[ -f "$ROOT/mobile/app/(tabs)/trading.js" ]] || { echo "FAIL — Trading route missing"; exit 1; }
grep -q 'COACH G DECISION CONVERSATION' "$ROOT/mobile/app/(tabs)/trading.js" || { echo "FAIL — M20AR conversation layer missing"; exit 1; }
grep -q 'entryParams={entryParams}' "$ROOT/mobile/app/(tabs)/trading.js" || { echo "FAIL — M20AR4 entry-context render missing"; exit 1; }
cp "$SOURCE" "$TARGET"
chmod +x "$TARGET"
echo "NO APP CODE CHANGED — verification contract only."
echo "UPDATED — AQ3 render check now accepts DecisionLabHome props added by M20AR4."
echo "PC-030M20AR5 applied successfully."
