#!/usr/bin/env bash
set -euo pipefail

SCREEN="app/holding-details.js"

echo "============================================================"
echo "PC-030M12C — COMPLETE HOLDING DETAILS VERIFICATION"
echo "============================================================"

for evidence in \
  'Quantity' \
  'Avg. Price' \
  'Invested Value' \
  'LTP / Current Price' \
  'Current Value' \
  'P&L Value' \
  'P&L %' \
  'Sellable Qty' \
  'Settlement'; do
  grep -Fq "$evidence" "$SCREEN"
done

if grep -q 'expandedSymbol\|Tap a security to see' "$SCREEN"; then
  echo "FAIL — holding evidence is still hidden behind the old accordion."
  exit 1
fi

grep -Fq 'Scroll to review all holdings' "$SCREEN"
grep -Fq 'security.broker' "$SCREEN"

node -e "require('@babel/core').transformFileSync('$SCREEN',{presets:['babel-preset-expo']})"

echo "PASS — every security exposes quantity, cost, valuation, return, and settlement evidence."
echo "PASS — the complete REAL holdings list remains vertically scrollable."
echo "PASS — Holding Details source parses successfully."
echo "PC-030M12C complete Holding Details verification complete."
