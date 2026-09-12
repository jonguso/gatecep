#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AT2C — BUY Auto-Quantity Handoff Correction"

FILE='mobile/app/trade.js'

grep -q 'PC-030M20AT2C buy-auto-quantity correction' "$FILE"
grep -q 'proposedAmount: requestedProposedAmount' "$FILE"
grep -q 'amount: requestedAmount' "$FILE"
grep -q 'requestedDecisionAmount' "$FILE"
grep -q 'Known percentage charges are included in the quantity estimate' "$FILE"

node mobile/scripts/test-pc030m20at2c-buy-auto-quantity.mjs

echo "PASS — BUY accepts scenario budget aliases from Decision Lab/Coach G handoffs."
echo "PASS — BUY auto-quantity works when Cost Basis Source is NOT HELD."
echo "PASS — BUY remains charge-aware."
echo "PASS — manual quantity still wins."

if [[ -f scripts/verify-pc030m20at2b-existingholding-init-order-hotfix.sh ]]; then
  echo "Running M20AT2B regression..."
  bash scripts/verify-pc030m20at2b-existingholding-init-order-hotfix.sh
fi

echo "PC-030M20AT2C verification complete."
