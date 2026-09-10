#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
echo "PC-030M20AQ — Coach G Decision Lab"
node mobile/scripts/test-pc030m20aq-coach-g-decision-lab.mjs
FILE="mobile/app/(tabs)/trading.js"
grep -q 'Coach G Decision Lab' "$FILE" && echo 'PASS — Home Trading destination is now the Coach G Decision Lab.'
grep -q 'Simulate a Buy' "$FILE" && grep -q 'Simulate a Sell' "$FILE" && echo 'PASS — investor-facing entry uses scenario/simulation language.'
grep -q 'Risk & Recovery' "$FILE" && grep -q 'needs +' "$FILE" && echo 'PASS — recovery-risk education is visible in the Decision Lab.'
grep -q 'Review Goal & Recovery Context' "$FILE" && echo 'PASS — Decision Lab connects to the existing Wealth Journey goal/recovery context.'
grep -q 'mode: "BROKER_PLAN"' "$FILE" && echo 'PASS — preferred decisions hand off only to the advisory Broker Action Plan.'
grep -q 'Broker Evidence' "$FILE" && grep -q 'TRADING_TABS' "$FILE" && echo 'PASS — existing Account / Orders / Depth / Activity broker evidence is retained beneath the Decision Lab.'
if grep -q 'queueExecutionOrders' "$FILE"; then echo 'PASS — existing broker-evidence code remains present; M20AQ does not delete prior functionality.'; fi

echo 'Running M20AP and prior regressions when present...'
for s in \
  scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh \
  scripts/verify-pc030m20ao-fifo-acquisition-date-normalization.sh \
  scripts/verify-pc030m20an-runtime-market-symbol-canonicalization.sh \
  scripts/verify-pc030m20am-investor-facing-canonical-symbol.sh \
  mobile/scripts/verify-pc030m20al-canonical-security-identity.sh \
  mobile/scripts/verify-pc030m20aj-transaction-date-anchor-window.sh; do
  if [[ -f "$s" ]]; then bash "$s"; break; fi
done

echo 'PC-030M20AQ verification complete.'
