#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"

echo "PC-030M20AP — Trade Lab & Broker Action Plan Navigation Boundary"

TRADE="mobile/app/trade.js"
BASKET="mobile/app/basket-execution.js"

for f in "$TRADE" "$BASKET"; do
  [[ -f "$f" ]] || { echo "FAIL — missing $f"; exit 1; }
done

grep -q 'Trade Lab — Average Cost Scenario' "$TRADE" || { echo "FAIL — REAL scenario title is not Trade Lab."; exit 1; }
echo "PASS — REAL average-cost flow is presented as Trade Lab, not an execution ticket."

grep -q 'averageCostMode ? "Scenario Inputs" : "Order Ticket"' "$TRADE" || { echo "FAIL — scenario input terminology missing."; exit 1; }
grep -q 'averageCostMode ? "Scenario Estimate" : "Trade Estimate"' "$TRADE" || { echo "FAIL — scenario estimate terminology missing."; exit 1; }
grep -q 'averageCostMode ? `Simulate ${item}` : item' "$TRADE" || { echo "FAIL — Simulate Buy/Sell labels missing."; exit 1; }
echo "PASS — REAL scenario controls use simulation terminology while Practice trade terminology remains intact."

grep -q 'params: { mode: "BROKER_PLAN" }' "$TRADE" || { echo "FAIL — broker plan mode is not preserved from Trade Lab."; exit 1; }
grep -q 'Back to Broker Action Plan' "$TRADE" || { echo "FAIL — Trade Lab back label still implies basket execution."; exit 1; }
echo "PASS — Trade Lab returns to Broker Action Plan with BROKER_PLAN context."

grep -q 'Broker Action Plan Review' "$BASKET" || { echo "FAIL — broker plan screen title not updated."; exit 1; }
grep -q 'Practice Basket Simulation' "$BASKET" || { echo "FAIL — Practice Basket Simulation mode was removed."; exit 1; }
grep -q 'brokerPlanMode' "$BASKET" || { echo "FAIL — broker/practice mode boundary missing."; exit 1; }
grep -q 'cannot update REAL or Practice holdings' "$BASKET" || { echo "FAIL — advisory mutation safeguard missing."; exit 1; }
echo "PASS — Broker Action Plan and Practice Basket remain explicitly separated."

# Ensure the existing broker-plan entry path still passes mode.
COUNT=$(grep -o 'mode: "BROKER_PLAN"' "$TRADE" | wc -l | tr -d ' ')
[[ "$COUNT" -ge 2 ]] || { echo "FAIL — expected both Add-to-Plan and Back-to-Plan routes to preserve BROKER_PLAN mode."; exit 1; }
echo "PASS — both broker-plan navigation paths preserve the advisory mode."

# Prior regression chain when installed.
if [[ -x scripts/verify-pc030m20ao-fifo-acquisition-date-normalization.sh ]]; then
  echo "Running M20AO and prior regressions..."
  bash scripts/verify-pc030m20ao-fifo-acquisition-date-normalization.sh
fi

echo "PC-030M20AP verification complete."
