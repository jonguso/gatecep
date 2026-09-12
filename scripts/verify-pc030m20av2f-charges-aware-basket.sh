#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV2F — Charges-Aware Diversified Basket Simulation"
node mobile/scripts/test-pc030m20av2f-charges-aware-basket.mjs
grep -Fq 'buildChargesAwareRecoveryBasket' mobile/app/goal-recovery-preview.js
grep -Fq 'loadBrokerAccounts' mobile/app/goal-recovery-preview.js
grep -Fq 'Verified estimated charges' mobile/app/goal-recovery-preview.js
grep -Fq 'allocation:state.executionAllocation||allocation' mobile/app/goal-recovery-preview.js
grep -Fq 'estimatedCharges: row.estimatedCharges' mobile/src/features/wealth-journey/goalRecoveryBasketHandoffService.js
grep -Fq 'compareVerifiedBrokerCharges' mobile/src/features/wealth-journey/goalRecoveryChargesAwareBasketService.js
grep -Fq 'chargesInvented:false' mobile/src/features/wealth-journey/goalRecoveryChargesAwareBasketService.js
echo "PASS — verified fee schedules drive charges-aware BUY quantities."
echo "PASS — each security stays within its allocated all-in budget."
echo "PASS — total basket remains within recovery scenario funding."
echo "PASS — missing fee evidence remains unavailable rather than fabricated."
echo "PASS — Broker Action Plan receives the same charges-aware quantities and fee evidence."
echo "PC-030M20AV2F verification complete."
