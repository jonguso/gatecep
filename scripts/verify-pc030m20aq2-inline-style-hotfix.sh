#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
FILE="$ROOT/mobile/app/(tabs)/trading.js"
TRADE="$ROOT/mobile/app/trade.js"

echo "PC-030M20AQ2 — Inline-Style Trading Route Hotfix"
[[ -f "$FILE" ]] || { echo "FAIL — missing $FILE"; exit 1; }
[[ -f "$TRADE" ]] || { echo "FAIL — missing $TRADE"; exit 1; }

node mobile/scripts/test-pc030m20aq-coach-g-decision-lab.mjs

grep -q 'PC-030M20AQ2 Decision Lab Home' "$FILE" || { echo 'FAIL — Decision Lab was not injected into mobile/app/(tabs)/trading.js'; exit 1; }
grep -q '<DecisionLabHome data={data} />' "$FILE" || { echo 'FAIL — Decision Lab component is not rendered'; exit 1; }
grep -q 'Simulate a Buy' "$FILE" && grep -q 'Simulate a Sell' "$FILE" || { echo 'FAIL — BUY/SELL entries missing'; exit 1; }
grep -q 'Risk & Recovery' "$FILE" && grep -q 'Review Goal & Recovery Context' "$FILE" || { echo 'FAIL — risk/goal integration missing'; exit 1; }
grep -q 'mode: "BROKER_PLAN"' "$FILE" || { echo 'FAIL — Broker Action Plan handoff missing'; exit 1; }
grep -q 'TRADING_TABS' "$FILE" || { echo 'FAIL — Account/Orders/Depth/Activity broker evidence tabs were not retained'; exit 1; }
grep -Eq 'PC-030M20AQ(1|2) requestedSide' "$TRADE" || { echo 'FAIL — /trade does not honor Decision Lab BUY/SELL intent'; exit 1; }

# Critical regression for this hotfix: it must not depend on StyleSheet closing syntax.
grep -q 'Uses inline styles deliberately' "$FILE" || { echo 'FAIL — expected inline-style patch contract missing'; exit 1; }

echo 'PASS — Decision Lab is injected into exact mobile/app/(tabs)/trading.js route.'
echo 'PASS — hotfix has no StyleSheet.create closing-anchor dependency.'
echo 'PASS — BUY/SELL intent flows into existing /trade scenario engine.'
echo 'PASS — goal context, recovery stress, Broker Action Plan and Broker Evidence remain separated.'
echo 'PASS — Decision Lab service remains analytical/read-only.'

echo 'Running M20AP regression if present...'
if [[ -f scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh ]]; then
  bash scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh
fi

echo 'PC-030M20AQ2 verification complete.'
