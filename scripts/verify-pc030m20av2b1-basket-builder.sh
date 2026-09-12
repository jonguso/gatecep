#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV2B1 — Basket Handoff Pure Builder Correction"

node mobile/scripts/test-pc030m20av2b1-basket-builder.mjs

grep -Fq 'saveBasketExecution' mobile/app/goal-recovery-allocation.js
grep -Fq 'Review diversified basket simulation' mobile/app/goal-recovery-allocation.js
grep -Fq 'pathname: "/basket-execution"' mobile/app/goal-recovery-allocation.js
grep -Fq 'mode: "BROKER_PLAN"' mobile/app/goal-recovery-allocation.js

grep -Fq 'BROKER_HANDOFF_ONLY' mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js
grep -Fq 'scenarioFundingOnly: true' mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js
grep -Fq 'brokerExecutionConfirmed: false' mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js

if grep -Fq 'basketExecutionStore' mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js; then
  echo "ERROR — pure AV2B1 builder must not import runtime basket storage."
  exit 1
fi

echo "PASS — Node regression no longer depends on Expo/runtime storage module resolution."
echo "PASS — app still saves the built execution through canonical saveBasketExecution."
echo "PASS — diversified recovery allocation remains a multi-security REVIEW basket."
echo "PASS — scenario funding stays separate from REAL available cash."
echo "PC-030M20AV2B1 verification complete."
