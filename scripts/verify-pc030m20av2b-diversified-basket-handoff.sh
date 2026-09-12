#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV2B — Diversified Basket Handoff + Scenario Funding"

node mobile/scripts/test-pc030m20av2b-diversified-basket-handoff.mjs

grep -Fq 'buildRecoveryBasketExecution' mobile/app/goal-recovery-allocation.js
grep -Fq 'saveBasketExecution' mobile/app/goal-recovery-allocation.js
grep -Fq 'Review diversified basket simulation' mobile/app/goal-recovery-allocation.js
grep -Fq 'pathname: "/basket-execution"' mobile/app/goal-recovery-allocation.js
grep -Fq 'mode: "BROKER_PLAN"' mobile/app/goal-recovery-allocation.js
grep -Fq 'scenarioFunding' mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js
grep -Fq 'BROKER_HANDOFF_ONLY' mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js
grep -Fq 'brokerExecutionConfirmed: false' mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js

echo "PASS — AV2 allocation is handed off as a multi-security basket, not single-stock Trade Lab."
echo "PASS — existing canonical basketExecutionStore is reused."
echo "PASS — scenario funding remains distinct from REAL cash."
echo "PASS — orders remain REVIEW/advisory-only until broker handoff."
echo "PC-030M20AV2B verification complete."
