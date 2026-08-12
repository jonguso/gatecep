#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== DASHBOARD PRIMARY DESTINATIONS ====="
grep -n -A5 -B2 'title="Coach G"\|title="Wealth Journey"\|title="Portfolio Hub"' app/'(tabs)'/dashboard.js

echo
echo "===== MENU PRIMARY DESTINATIONS ====="
grep -n -A4 -B2 'title: "Coach G"\|title: "Wealth Journey"\|title: "Activity"' app/menu.js

echo
echo "===== CANONICAL COACH ANALYSIS LINKS ====="
grep -n 'Wealth Journey\|Portfolio Hub\|portfolio-activity' app/'(tabs)'/coach.js

echo
echo "===== LEGACY COACH DASHBOARD COMPATIBILITY ====="
grep -n 'title="Goals"\|title="Activity"' app/coach-dashboard.js

if grep -q 'route="/goals"' app/coach-dashboard.js; then
  echo "ERROR: legacy /goals route remains."
  exit 1
fi

if grep -q 'route="/transactions"' app/coach-dashboard.js; then
  echo "ERROR: legacy /transactions route remains in coach-dashboard."
  exit 1
fi

echo
echo "===== WEALTH JOURNEY HOME ROUTE ====="
grep -n -A4 -B4 'Return to My Journey\|router.replace("/(tabs)/dashboard")' app/wealth-journey.js

echo
echo "===== PRACTICE / DNA POLICY TEXT ====="
grep -n -A5 -B2 'Practice remains a learning sandbox' app/wealth-journey.js

echo
echo "===== VISIBLE ROUTE AUDIT ====="
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
echo "===== SYNTAX ====="
node --check app/'(tabs)'/dashboard.js
node --check app/'(tabs)'/coach.js
node --check app/menu.js
node --check app/coach-dashboard.js
node --check app/wealth-journey.js
node --check app/reconciliation-conversation.js
node --check app/dna-update-review.js

echo
echo "PC-029C verification complete."
