#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028Y ENGINE ====="
grep -n   "buildDNAReconciliationSignalFingerprint\|classifyClarificationResolution\|resolveDNAReconciliationSignals\|buildExplicitDNAUpdateReviewProposal\|buildClarificationResolutionContext"   src/features/wealth-journey/clarificationResolutionEngine.js

echo
echo "===== PC-028Y SERVICE ====="
grep -n   "loadCurrentClarificationResolutionContext\|loadCurrentDNAUpdateReviewProposal"   src/features/wealth-journey/clarificationResolutionService.js

echo
echo "===== CONVERSATION RESOLUTION WIRING ====="
grep -n   "buildClarificationResolutionContext\|clarificationResolution\|dnaUpdateReview\|signalFingerprint"   src/features/wealth-journey/coachGReconciliationConversationService.js

echo
echo "===== INDEX EXPORTS ====="
grep -n   "clarificationResolution"   src/features/wealth-journey/index.js

echo
echo "===== SYNTAX ====="
node --check src/features/wealth-journey/clarificationResolutionEngine.js
node --check src/features/wealth-journey/clarificationResolutionService.js
node --check src/features/wealth-journey/coachGReconciliationConversationService.js

echo
echo "PC-028Y verification complete."
