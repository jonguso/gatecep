#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M10E — MYSTOCKS MANUAL MARKET IMPORT VERIFICATION"
echo "============================================================"

node scripts/test-pc030m10e-mystocks-manual-import.mjs
node --check src/services/marketData/MyStocksCsvNormalizer.js
node --check src/modules/market-cache/manualMarketImport.service.js
node --check src/modules/market-cache/marketCache.service.js
node --check src/modules/market-cache/marketCache.routes.js
node --check src/server.js

grep -q 'MARKET_IMPORT_KEY' .env.example
grep -q 'manual-import/preview' src/modules/market-cache/marketCache.routes.js
grep -q 'manual-import/commit' src/modules/market-cache/marketCache.routes.js
grep -q 'MYSTOCKS_MANUAL_EXPORT' src/modules/market-cache/marketCache.service.js
test -f ../mobile/app/market-price-import.js
grep -q 'Market Price Import' ../mobile/app/menu.js
grep -q 'Confirm Price Import' ../mobile/app/market-price-import.js
grep -q 'Platform.OS === "web"' ../mobile/app/market-price-import.js
grep -q 'selected.file.text' ../mobile/app/market-price-import.js
grep -q 'FileSystem.readAsStringAsync' ../mobile/app/market-price-import.js
node --check ../mobile/src/services/markets/manualMarketImportApi.js
node --check ../mobile/src/services/markets/canonicalNseQuoteService.js
grep -q 'Platform.OS === "web"' ../mobile/src/config/apiConfig.js
grep -q 'window.location?.hostname' ../mobile/src/config/apiConfig.js
grep -q 'http://${webHost}:4000' ../mobile/src/config/apiConfig.js

echo "PASS — restricted preview and commit routes are configured."
echo "PASS — immutable audit evidence and restart restoration are configured."
echo "PASS — focused mobile import, preview, and confirmation controls are configured."
echo "PASS — browser File reading and Expo Go native FileSystem reading are both configured."
echo "PASS — localhost web and Expo Go LAN resolve their intended local backend."
echo "PC-030M10E myStocks manual market import verification complete."
