#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== COACH IMPORT + CARD ====="
grep -n \
  "CoachGReconciliationCard" \
  app/'(tabs)'/coach.js

echo
echo "===== COACH INSERTION AREA ====="
grep -n -A14 -B4 \
  "Coach G Insights" \
  app/'(tabs)'/coach.js

echo
echo "===== WEALTH JOURNEY IMPORT + CARD ====="
grep -n \
  "CoachGReconciliationCard" \
  app/wealth-journey.js

echo
echo "===== WEALTH JOURNEY INSERTION AREA ====="
grep -n -A18 -B6 \
  "CoachGReconciliationCard" \
  app/wealth-journey.js

echo
echo "===== PC-028X SUPPORT FILES ====="
grep -n \
  "CoachGReconciliationCard" \
  src/features/wealth-journey/components/CoachGReconciliationCard.js

grep -n \
  "ReconciliationConversationScreen" \
  app/reconciliation-conversation.js

echo
echo "===== SYNTAX ====="
node --check app/'(tabs)'/coach.js
node --check app/wealth-journey.js
node --check src/features/wealth-journey/components/CoachGReconciliationCard.js
node --check app/reconciliation-conversation.js

echo
echo "PC-028X1 verification complete."
