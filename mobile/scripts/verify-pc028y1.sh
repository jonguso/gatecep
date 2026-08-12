#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028Y1 IMPORTS ====="
grep -n \
  "buildDNAReconciliationSignalFingerprint\|buildClarificationResolutionContext" \
  src/features/wealth-journey/coachGReconciliationConversationService.js

echo
echo "===== PC-028Y1 LOAD FUNCTION ====="
grep -n -A65 -B8 \
  "loadCurrentCoachGReconciliationConversation" \
  src/features/wealth-journey/coachGReconciliationConversationService.js

echo
echo "===== PC-028Y1 SUBMIT FUNCTION ====="
grep -n -A45 -B6 \
  "submitCoachGReconciliationClarification" \
  src/features/wealth-journey/coachGReconciliationConversationService.js

echo
echo "===== PC-028Y ENGINE + SERVICE PRESENT ====="
grep -n \
  "buildClarificationResolutionContext" \
  src/features/wealth-journey/clarificationResolutionEngine.js

grep -n \
  "loadCurrentClarificationResolutionContext\|loadCurrentDNAUpdateReviewProposal" \
  src/features/wealth-journey/clarificationResolutionService.js

echo
echo "===== SYNTAX ====="
node --check \
  src/features/wealth-journey/coachGReconciliationConversationService.js

node --check \
  src/features/wealth-journey/clarificationResolutionEngine.js

node --check \
  src/features/wealth-journey/clarificationResolutionService.js

echo
echo "PC-028Y1 verification complete."
