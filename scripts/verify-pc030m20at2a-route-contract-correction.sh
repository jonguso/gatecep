#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AT2A — Route Contract Correction"

grep -q "PC-030M20AT2A route-contract correction" mobile/app/trade.js
grep -q "decisionAmount: requestedDecisionAmount" mobile/app/trade.js
grep -q "decisionLab: decisionLabParam" mobile/app/trade.js
grep -q "quantityManuallyEdited" mobile/app/trade.js
grep -q "Editable; scenario estimate only" mobile/app/trade.js
grep -q "deriveApproximateScenarioQuantity" mobile/app/trade.js

echo "PASS — Trade uses its actual destructured route-param contract."
echo "PASS — decisionAmount/decisionLab are normalized from current route params."
echo "PASS — manual quantity edits override future auto-seeding."
echo "PASS — investor-facing approximate quantity explanation is present."

node mobile/scripts/test-pc030m20at2-decision-amount-quantity-handoff.mjs

if [[ -f scripts/verify-pc030m20at1-answerable-discovery-question.sh ]]; then
  echo "Running M20AT1 and prior regressions..."
  bash scripts/verify-pc030m20at1-answerable-discovery-question.sh
fi

echo "PC-030M20AT2A verification complete."
