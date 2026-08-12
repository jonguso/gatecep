#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-029A ROUTE NORMALIZATION ====="

grep -RniE   'router\.(push|replace)\("/(dashboard|trading|coach|funds|portfolio)"'   app src   --include="*.js"   --include="*.jsx"   || true

echo
echo "===== EXPECTED CANONICAL ROUTES ====="

grep -RniE   'router\.(push|replace)\("/\(tabs\)/(dashboard|trading|coach|funds)"|router\.(push|replace)\("/portfolio-hub"'   app src   --include="*.js"   --include="*.jsx"   | head -n 120

echo
echo "===== PATCH / BACKUP ROUTES STILL INSIDE app ====="

find app   -type f   \(     -iname "*patch*.js"     -o -iname "*backup*.js"     -o -iname "*-integration.js"   \)   -print

echo
echo "===== ROUTE AUDIT ====="

python scripts/audit-pc029a-routes.py

echo
echo "===== CRITICAL NAV FILE SYNTAX ====="

node --check app/'(tabs)'/dashboard.js
node --check app/'(tabs)'/coach.js
node --check app/'(tabs)'/trading.js
node --check app/'(tabs)'/funds.js
node --check app/portfolio-hub.js
node --check app/wealth-journey.js
node --check app/reconciliation-conversation.js
node --check app/dna-update-review.js

echo
echo "PC-029A verification complete."
