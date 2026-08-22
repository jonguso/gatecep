#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M10F — LOCAL VERIFIED EOD VERIFICATION"
echo "============================================================"

node scripts/test-pc030m10f-local-verified-eod.mjs
node scripts/test-pc030m10d-apify-full-nse-market.mjs

node --check src/modules/market-cache/marketEod.repository.js
node --check src/modules/market-cache/marketEodPolicy.js
node --check src/modules/market-cache/marketEodCollector.service.js
node --check src/services/marketData/LocalVerifiedEodAdapter.js
node --check src/services/marketData/MarketDataGateway.js
node --check src/modules/market-cache/marketCache.scheduler.js
node --check src/modules/market-cache/marketCache.routes.js
node --check src/server.js

echo "PASS — local verified EOD source parses successfully."
echo "PC-030M10F local verified EOD verification complete."
