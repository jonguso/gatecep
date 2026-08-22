#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M10H — DYNAMIC MARKET UNIVERSE VERIFICATION"
echo "============================================================"

node scripts/test-pc030m10h-dynamic-market-universe.mjs
node --check 'app/(tabs)/markets.js'
node --check app/watchlist.js
node --check src/services/markets/useMarketData.js
node --check src/services/markets/marketHubData.js

echo "PC-030M10H dynamic market universe verification complete."
