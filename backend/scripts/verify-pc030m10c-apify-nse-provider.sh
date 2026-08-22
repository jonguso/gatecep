#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M10C — APIFY NSE PROVIDER VERIFICATION"
echo "============================================================"
node scripts/test-pc030m10c-apify-nse-provider.mjs
node --check src/services/marketData/ApifyNseNormalizer.js
node --check src/services/marketData/ApifyNseMarketDataAdapter.js
node --check src/services/marketData/MarketDataGateway.js
node --check src/modules/market-cache/marketCache.service.js
node --check src/modules/market-cache/marketCache.scheduler.js
grep -q 'Authorization: `Bearer ${token}`' src/services/marketData/ApifyNseMarketDataAdapter.js
! grep -q 'token=' src/services/marketData/ApifyNseMarketDataAdapter.js
grep -q 'maxTotalChargeUsd' src/services/marketData/ApifyNseMarketDataAdapter.js
grep -q 'refreshInFlight' src/modules/market-cache/marketCache.service.js
echo "PASS — Apify token is sent in a backend-only Bearer header."
echo "PASS — synchronous dataset items feed the verified valuation boundary."
echo "PASS — overlapping refreshes are coalesced and Actor cost is capped."
echo "PC-030M10C Apify NSE provider verification complete."
