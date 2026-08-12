#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028V ENGINE ====="
grep -n   "extractRecommendationActions\|buildRecommendationObservedActivity\|evaluateRecommendationActionOutcome\|reconcileRecommendationOutcome\|reconcileRecommendationHistoryOutcomes\|buildRecommendationOutcomeSummary"   src/features/wealth-journey/recommendationOutcomeReconciliationEngine.js

echo
echo "===== PC-028V SERVICE ====="
grep -n   "loadReconciledCoachGRecommendationHistory"   src/features/wealth-journey/recommendationOutcomeReconciliationService.js

echo
echo "===== PC-028T RUNTIME ====="
grep -n   "reconcileRecommendationHistoryOutcomes"   src/features/wealth-journey/investorDNAReconciliationRuntime.js

echo
echo "===== SYNTAX ====="
node --check src/features/wealth-journey/recommendationOutcomeReconciliationEngine.js
node --check src/features/wealth-journey/recommendationOutcomeReconciliationService.js
node --check src/features/wealth-journey/investorDNAReconciliationRuntime.js

echo
echo "PC-028V verification complete."
