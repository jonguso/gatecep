#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV2F2 — Fee Evidence + Residual Funding Integrity"
node mobile/scripts/test-pc030m20av2f2-fee-evidence-integrity.mjs
grep -Fq 'feeSchedule: account.feeSchedule || null' mobile/src/services/brokers/brokerAccountStore.js
grep -Fq 'feeSchedule: existing?.feeSchedule || null' mobile/app/broker-accounts.js
grep -Fq 'feeSchedule: defaultAccount.feeSchedule || null' mobile/app/broker-accounts.js
grep -Fq 'grossFundingRemainingBeforeCharges' mobile/src/features/wealth-journey/goalRecoveryChargesAwareBasketService.js
grep -Fq 'scenarioFundingRemainingAfterCharges' mobile/src/features/wealth-journey/goalRecoveryChargesAwareBasketService.js
grep -Fq 'remainingScenarioFundingMeaning' mobile/src/features/wealth-journey/goalRecoveryChargesAwareBasketService.js
grep -Fq 'Gross funding remaining before charges' mobile/app/goal-recovery-preview.js
grep -Fq 'Scenario funding remaining after estimated charges' mobile/app/goal-recovery-preview.js
grep -Fq '"Unavailable"' mobile/app/goal-recovery-preview.js
echo "PASS — canonical broker profiles preserve fee evidence."
echo "PASS — Broker Accounts edits do not erase existing fee schedules."
echo "PASS — unavailable charges show an explicit unavailable state."
echo "PASS — gross residual and post-charge residual are semantically distinct."
echo "PASS — no Trade screen hard-coded fee policy was copied into broker evidence."
echo "PC-030M20AV2F2 verification complete."
