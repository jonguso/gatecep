#!/usr/bin/env bash
set -e
cd ~/gatecep/mobile

echo "===== CANONICAL HISTORY SERVICE ====="
grep -n "loadCanonicalRealTransactionHistory\|loadCanonicalCoachGRecommendationHistory\|loadCanonicalRealOrderHistory\|loadCanonicalRealBehaviorHistory\|simulatedTradesLoaded\|activeBasketUsedAsHistory" src/features/wealth-journey/canonicalRealBehaviorHistoryService.js

echo "===== PC-028T RUNTIME INTEGRATION ====="
grep -n "loadCanonicalRealBehaviorHistory\|canonicalBehaviorHistory\|recommendationHistory = null\|orderHistory = null\|tradeHistory = null" src/features/wealth-journey/investorDNAReconciliationRuntime.js

echo "===== SYNTAX ====="
node --check src/features/wealth-journey/canonicalRealBehaviorHistoryService.js
node --check src/features/wealth-journey/investorDNAReconciliationRuntime.js
node --check src/features/wealth-journey/realBehaviorHistorySourcePolicy.js

echo "PC-028U LIVE integration verification complete."
