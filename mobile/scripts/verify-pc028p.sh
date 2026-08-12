#!/usr/bin/env bash
set -e
cd ~/gatecep/mobile

echo "===== DASHBOARD FORMULA ====="
grep -n \
  "selectedViewNetWorth\|Practice Net Worth\|Real Investment Net Worth\|Account Net Worth" \
  app/'(tabs)'/dashboard.js

echo
echo "===== CANONICAL CASH ====="
grep -n \
  "syncedAvailableCash\|allAccounts.availableCash\|allAccounts.totalValue" \
  src/features/wealth-journey/canonicalRealWealthContextService.js

echo
echo "===== SYNTAX ====="
node --check app/'(tabs)'/dashboard.js
node --check src/features/wealth-journey/canonicalRealWealthContextService.js
node --check src/features/wealth-journey/canonicalRealWealthMetricsService.js

echo
echo "PC-028P verification complete."
