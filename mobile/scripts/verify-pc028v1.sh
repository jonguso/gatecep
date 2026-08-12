#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028V1 RUNTIME IMPORT ====="
grep -n   "reconcileRecommendationHistoryOutcomes"   src/features/wealth-journey/investorDNAReconciliationRuntime.js

echo
echo "===== PC-028V1 RUNTIME BLOCK ====="
grep -n -A35 -B8   "recommendationHistory:"   src/features/wealth-journey/investorDNAReconciliationRuntime.js

echo
echo "===== SYNTAX ====="
node --check src/features/wealth-journey/investorDNAReconciliationRuntime.js
node --check src/features/wealth-journey/recommendationOutcomeReconciliationEngine.js

echo
echo "PC-028V1 verification complete."
