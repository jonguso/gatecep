#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AT2 — Decision Amount → Approximate Quantity Handoff"

node mobile/scripts/test-pc030m20at2-decision-amount-quantity-handoff.mjs

grep -q "PC-030M20AT2 approximate quantity handoff" mobile/app/trade.js
grep -q "deriveApproximateScenarioQuantity" mobile/app/trade.js
grep -q "Editable; scenario estimate only" mobile/app/trade.js
grep -q "decisionAmountParam" mobile/app/trade.js

echo "PASS — Decision Lab amount seeds approximate Trade Lab quantity."
echo "PASS — quantity remains editable and is not execution evidence."
echo "PASS — SELL caps to available holding; BUY accounts for known percentage charges."

if [[ -f scripts/verify-pc030m20at1-answerable-discovery-question.sh ]]; then
  echo "Running M20AT1 and prior regressions..."
  bash scripts/verify-pc030m20at1-answerable-discovery-question.sh
fi

echo "PC-030M20AT2 verification complete."
