#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== WEALTH JOURNEY CHECK-IN ENTRY ====="
grep -n -A3 -B3   'CoachGReconciliationCard'   app/wealth-journey.js

echo
echo "===== RECONCILIATION CARD IDLE STATE ====="
grep -n -A45 -B8   'showWhenNotRequired\|Open Coach G Check-in\|Review your real investing journey'   src/features/wealth-journey/components/CoachGReconciliationCard.js

echo
echo "===== DNA REVIEW NAVIGATION ====="
grep -n -A18 -B8   'Review Investor DNA Changes\|View Investor DNA Review Status\|dna-update-review'   app/reconciliation-conversation.js

echo
echo "===== PRACTICE / DNA POLICY ====="
grep -n -A4 -B2   'Practice remains a learning sandbox'   app/wealth-journey.js

echo
echo "===== ROUTE AUDIT ====="
python scripts/audit-pc029c-visible-routes.py

echo
echo "===== NO BACKUPS INSIDE app ====="
COUNT="$(find app -type f -iname "*bak*" | wc -l)"
echo "Count: $COUNT"
if [ "$COUNT" -ne 0 ]; then
  find app -type f -iname "*bak*"
  exit 1
fi

echo
echo "PC-029D verification complete."
echo
echo "Now start Metro:"
echo "  npx expo start -c"
