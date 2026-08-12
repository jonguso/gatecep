#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== CANONICAL CASH SERVICE ====="
grep -n   "loadCanonicalRealAvailableCash\|buildCanonicalCashContext\|realCashFallsBackToPractice"   src/features/portfolio-cash/canonicalPortfolioCashService.js

echo
echo "===== DASHBOARD CASH ====="
grep -n   "canonicalRealCash\|loadCanonicalRealAvailableCash\|practicePortfolio?.availableCash"   app/'(tabs)'/dashboard.js

echo
echo "===== PORTFOLIO HUB CASH ====="
grep -n   "canonicalRealCash\|loadCanonicalRealAvailableCash\|setPortfolioCash"   app/portfolio-hub.js

echo
echo "===== WEALTH CONTEXT CASH ====="
grep -n   "canonicalRealCash\|loadCanonicalRealAvailableCash\|syncedAvailableCash"   src/features/wealth-journey/canonicalRealWealthContextService.js

echo
echo "===== SYNTAX ====="
node --check src/features/portfolio-cash/canonicalPortfolioCashService.js
node --check app/'(tabs)'/dashboard.js
node --check app/portfolio-hub.js
node --check src/features/wealth-journey/canonicalRealWealthContextService.js

echo
echo "PC-028R verification complete."
