#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== ACCOUNT CASH SERVICE ====="
grep -n   "loadAggregateRealAvailableCash\|loadAccountCashMap\|loadRealAvailableCashForSource\|buildAccountScopedCashContext"   src/features/portfolio-cash/accountScopedPortfolioCashService.js

echo
echo "===== DASHBOARD ====="
grep -n   "loadRealAvailableCashForSource\|setCanonicalRealCash"   app/'(tabs)'/dashboard.js

echo
echo "===== PORTFOLIO HUB ====="
grep -n   "loadRealAvailableCashForSource\|resolvedCash\|setPortfolioCash"   app/portfolio-hub.js

echo
echo "===== SYNTAX ====="
node --check src/features/portfolio-cash/accountScopedPortfolioCashService.js
node --check app/'(tabs)'/dashboard.js
node --check app/portfolio-hub.js
node --check src/features/wealth-journey/canonicalRealWealthContextService.js

echo
echo "PC-028S verification complete."
