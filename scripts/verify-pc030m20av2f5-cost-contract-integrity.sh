#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV2F5 — Preview -> Broker Plan Cost Contract Integrity"
node mobile/scripts/test-pc030m20av2f5-cost-contract.mjs
grep -Fq 'allocationBudget:' mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js
grep -Fq 'costSummary:' mobile/src/features/wealth-journey/goalRecoveryBrokerActionPlanBridge.js
grep -Fq 'plannedGrossPurchases' mobile/src/features/wealth-journey/goalRecoveryBrokerActionPlanBridge.js
grep -Fq 'Verified estimated charges: Unavailable' mobile/src/services/trade/brokerActionPlanStore.js
echo "PASS — preview gross values survive into Broker Action Plan when charges are unavailable."
echo "PASS — allocation budget is no longer displayed as order consideration."
echo "PASS — verified fees remain evidence-backed."
echo "PASS — unavailable fees remain unavailable, not zero."
echo "PASS — Broker Action Plan remains advisory and import-gated."
echo "PC-030M20AV2F5 verification complete."
