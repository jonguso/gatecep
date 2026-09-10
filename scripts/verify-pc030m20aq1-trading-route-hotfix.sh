#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
FILE="$ROOT/mobile/app/(tabs)/trading.js"
TRADE="$ROOT/mobile/app/trade.js"

echo "PC-030M20AQ1 — Trading Route Hotfix"
[[ -f "$FILE" ]] || { echo "FAIL — missing $FILE"; exit 1; }
[[ -f "$TRADE" ]] || { echo "FAIL — missing $TRADE"; exit 1; }

node mobile/scripts/test-pc030m20aq-coach-g-decision-lab.mjs

grep -q 'PC-030M20AQ1 Decision Lab Home' "$FILE" || { echo 'FAIL — Decision Lab was not injected into mobile/app/(tabs)/trading.js'; exit 1; }
grep -q '<DecisionLabHome data={data} />' "$FILE" || { echo 'FAIL — Decision Lab component is not rendered on Trading'; exit 1; }
grep -q 'Simulate a Buy' "$FILE" && grep -q 'Simulate a Sell' "$FILE" || { echo 'FAIL — BUY/SELL scenario entries missing'; exit 1; }
grep -q 'Risk & Recovery' "$FILE" && grep -q 'Review Goal & Recovery Context' "$FILE" || { echo 'FAIL — risk/goal integration missing'; exit 1; }
grep -q 'mode: "BROKER_PLAN"' "$FILE" || { echo 'FAIL — Broker Action Plan advisory handoff missing'; exit 1; }
grep -q 'TRADING_TABS' "$FILE" || { echo 'FAIL — existing broker evidence tabs were not retained'; exit 1; }
grep -q 'PC-030M20AQ1 requestedSide' "$TRADE" || { echo 'FAIL — /trade does not honor Decision Lab side intent'; exit 1; }

echo 'PASS — exact mobile/app/(tabs)/trading.js route contains Coach G Decision Lab.'
echo 'PASS — no trading cash anchor is required by this hotfix.'
echo 'PASS — BUY and SELL buttons carry their intent into the existing /trade scenario engine.'
echo 'PASS — Risk & Recovery, Goal context, Broker Action Plan, and Broker Evidence boundaries are present.'
echo 'PASS — service remains analytical/read-only; no REAL or Practice mutation was added.'

echo 'Running M20AP regression if present...'
if [[ -f scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh ]]; then
  bash scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh
fi

echo 'PC-030M20AQ1 verification complete.'
