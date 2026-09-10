#!/usr/bin/env bash
set -euo pipefail

echo "PC-030M20AR9A — Legacy Dialogue Regression Contract Correction"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node mobile/scripts/test-pc030m20ar4-investor-facing-dialogue.mjs

echo "PASS — M20AR4 integrity assertions remain enforced without blocking additive action-aware metadata."

if [[ -f scripts/verify-pc030m20ar9-action-aware-reasoning.sh ]]; then
  echo "Re-running M20AR9 and prior regressions..."
  bash scripts/verify-pc030m20ar9-action-aware-reasoning.sh
fi

echo "PC-030M20AR9A verification complete."
