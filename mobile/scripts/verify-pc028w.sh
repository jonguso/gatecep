#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028W ENGINE ====="
grep -n   "prioritizeDNAReconciliationSignals\|buildCoachGReconciliationPromptForSignal\|buildCoachGReconciliationConversation\|buildReconciliationResponseOptions\|buildDNAClarificationEvidence"   src/features/wealth-journey/coachGReconciliationConversationEngine.js

echo
echo "===== PC-028W STORE ====="
grep -n   "loadInvestorDNAReconciliationClarifications\|saveInvestorDNAReconciliationClarification"   src/features/wealth-journey/investorDNAReconciliationConversationStore.js

echo
echo "===== PC-028W SERVICE ====="
grep -n   "loadCurrentCoachGReconciliationConversation\|submitCoachGReconciliationClarification\|loadConfirmedDNAReconciliationClarifications"   src/features/wealth-journey/coachGReconciliationConversationService.js

echo
echo "===== SAFEGUARDS ====="
grep -n   "automaticDNAChange\|practiceEvidenceUsed\|oneIssueAtATime\|conclusionBeforeClarification"   src/features/wealth-journey/coachGReconciliationConversationEngine.js

echo
echo "===== SYNTAX ====="
node --check src/features/wealth-journey/coachGReconciliationConversationEngine.js
node --check src/features/wealth-journey/investorDNAReconciliationConversationStore.js
node --check src/features/wealth-journey/coachGReconciliationConversationService.js

echo
echo "PC-028W verification complete."
