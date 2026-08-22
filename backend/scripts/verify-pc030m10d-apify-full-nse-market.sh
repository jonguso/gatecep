#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M10D — APIFY FULL NSE MARKET VERIFICATION"
echo "============================================================"

node scripts/test-pc030m10d-apify-full-nse-market.mjs
node scripts/test-pc030m10c-apify-nse-provider.mjs

node --check src/services/marketData/ApifyNseNormalizer.js
node --check src/services/marketData/ApifyNsePolicy.js
node --check src/services/marketData/ApifyNseMarketDataAdapter.js
node --check src/data/nseSecurityMaster.js

echo "PASS — full-market Apify source parses successfully."
echo "PC-030M10D Apify full NSE market verification complete."
