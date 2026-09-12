#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV2C — Recovery Basket -> Broker Action Plan Bridge"

node mobile/scripts/test-pc030m20av2c-recovery-broker-plan-bridge.mjs

grep -Fq 'export async function saveBrokerActionPlan' mobile/src/services/trade/brokerActionPlanStore.js
grep -Fq 'buildRecoveryBrokerActionPlan' mobile/app/goal-recovery-allocation.js
grep -Fq 'saveBrokerActionPlan' mobile/app/goal-recovery-allocation.js
grep -Fq 'await saveBasketExecution(handoff.execution)' mobile/app/goal-recovery-allocation.js
grep -Fq 'await saveBrokerActionPlan(brokerPlan.plan)' mobile/app/goal-recovery-allocation.js
grep -Fq 'Scenario recovery funding:' mobile/app/basket-execution.js
grep -Fq 'BROKER_HANDOFF_ONLY' mobile/src/features/wealth-journey/goalRecoveryBrokerActionPlanBridge.js
grep -Fq 'brokerExecutionConfirmed: false' mobile/src/features/wealth-journey/goalRecoveryBrokerActionPlanBridge.js

echo "PASS — diversified recovery basket is saved to canonical basket state."
echo "PASS — same basket is saved to canonical Broker Action Plan state."
echo "PASS — BROKER_PLAN screen can load the recovery instructions."
echo "PASS — scenario funding and goal context stay advisory."
echo "PASS — no REAL/Practice execution boundary was weakened."
echo "PC-030M20AV2C verification complete."
