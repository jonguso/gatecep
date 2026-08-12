#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028T ENGINE ====="
grep -n \
  "buildInvestorDNAReconciliation\\|buildRecommendationFollowThroughSignals\\|calculateInvestorDNAReconciliationScore\\|buildCoachGDNAReconciliationQuestions\\|buildInvestorDNAUpdateProposal\\|loadInvestorDNAReconciliationIssues" \
  src/features/wealth-journey/investorDNAReconciliationEngine.js

echo
echo "===== PC-028T RUNTIME ====="
grep -n \
  "loadCurrentInvestorDNAReconciliation\\|loadCanonicalRealWealthMetrics\\|buildPortfolioHealthScore\\|buildBehaviorAnalytics\\|loadRealCurrentInvestorWealthJourney" \
  src/features/wealth-journey/investorDNAReconciliationRuntime.js

echo
echo "===== SAFEGUARDS ====="
grep -n \
  "practiceEvidenceAccepted\\|secondDNACreated\\|automaticDNAChange\\|realEvidenceOnly" \
  src/features/wealth-journey/investorDNAReconciliationEngine.js

echo
echo "===== SYNTAX ====="
node --check src/features/wealth-journey/investorDNAReconciliationEngine.js
node --check src/features/wealth-journey/investorDNAReconciliationRuntime.js

echo
echo "PC-028T verification complete."
