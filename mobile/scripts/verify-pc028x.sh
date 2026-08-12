#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028X CARD ====="
grep -n   "CoachGReconciliationCard\|loadCurrentCoachGReconciliationConversation\|reconciliation-conversation"   src/features/wealth-journey/components/CoachGReconciliationCard.js

echo
echo "===== PC-028X FULL SCREEN ====="
grep -n   "ReconciliationConversationScreen\|submitCoachGReconciliationClarification\|Save My Explanation\|What happens next"   app/reconciliation-conversation.js

echo
echo "===== COACH INTEGRATION ====="
grep -n   "CoachGReconciliationCard"   app/'(tabs)'/coach.js

echo
echo "===== WEALTH JOURNEY INTEGRATION ====="
grep -n   "CoachGReconciliationCard"   app/wealth-journey.js

echo
echo "===== SYNTAX ====="
node --check src/features/wealth-journey/components/CoachGReconciliationCard.js
node --check app/reconciliation-conversation.js
node --check app/'(tabs)'/coach.js
node --check app/wealth-journey.js

echo
echo "PC-028X verification complete."
