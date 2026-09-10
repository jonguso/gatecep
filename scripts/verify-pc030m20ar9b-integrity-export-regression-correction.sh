#!/usr/bin/env bash
set -euo pipefail

echo "PC-030M20AR9B — M20AR4 Integrity Export Regression Correction"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node mobile/scripts/test-pc030m20ar4-investor-facing-dialogue.mjs
echo "PASS — corrected M20AR4 regression uses the actual DECISION_DIALOGUE_INTEGRITY export."

if [[ -f scripts/verify-pc030m20ar9-action-aware-reasoning.sh ]]; then
  echo "Re-running M20AR9 and prior regressions..."
  bash scripts/verify-pc030m20ar9-action-aware-reasoning.sh
fi

echo "PC-030M20AR9B verification complete."
