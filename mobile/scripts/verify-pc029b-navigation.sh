#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-029B FIXED ROUTES ====="

grep -n   'manual-portfolio-entry\|holdings-import'   app/brokers.js

echo

grep -n   'oms-orders\|router.push("/orders")'   app/execution-bridge.js

echo
echo "===== DESTINATIONS EXIST ====="

test -f app/manual-portfolio-entry.js
echo "OK app/manual-portfolio-entry.js"

test -f app/orders.js
echo "OK app/orders.js"

echo
echo "===== .BAK FILES STILL INSIDE app ====="

BAK_COUNT="$(find app -type f -iname "*bak*" | wc -l)"
echo "Count: $BAK_COUNT"

if [ "$BAK_COUNT" -ne 0 ]; then
  echo "ERROR: .bak files remain inside app/"
  find app -type f -iname "*bak*"
  exit 1
fi

echo
echo "===== IMPROVED EXPO ROUTER AUDIT ====="

python scripts/audit-pc029b-routes.py

echo
echo "===== CRITICAL NAVIGATION SYNTAX ====="

node --check app/brokers.js
node --check app/execution-bridge.js
node --check app/manual-portfolio-entry.js
node --check app/orders.js
node --check app/'(tabs)'/dashboard.js
node --check app/'(tabs)'/coach.js
node --check app/portfolio-hub.js
node --check app/wealth-journey.js
node --check app/reconciliation-conversation.js
node --check app/dna-update-review.js

echo
echo "PC-029B verification complete."
