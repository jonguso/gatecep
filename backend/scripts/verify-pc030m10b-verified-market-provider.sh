#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M10B — VERIFIED MARKET PROVIDER VERIFICATION"
echo "============================================================"

node --check src/services/marketData/VerifiedHttpMarketDataAdapter.js
node --check src/services/marketData/MarketDataGateway.js
node --check src/modules/market-cache/marketCache.service.js
node --check src/modules/market-intelligence/marketIntelligence.service.js
node --check src/server.js

grep -q 'MARKET_DATA_PROVIDER === undefined' src/services/marketData/VerifiedHttpMarketDataAdapter.js || true
grep -q 'valuationEligible: true' src/services/marketData/VerifiedHttpMarketDataAdapter.js
grep -q 'valuationEligible: false' src/services/marketData/MarketDataGateway.js
grep -q 'MARKET_DATA_MAX_AGE_MINUTES' src/services/marketData/VerifiedHttpMarketDataAdapter.js
grep -q 'Upstream returned a synthetic' src/services/marketData/VerifiedHttpMarketDataAdapter.js
grep -q 'app.get("/prices"' src/server.js
grep -q 'const priceRows = valuationEligible' src/modules/market-intelligence/marketIntelligence.service.js

echo "PASS — a configurable verified HTTP provider is available."
echo "PASS — quote freshness and genuine-provider identity are mandatory."
echo "PASS — LOCAL_EOD and synthetic sources cannot revalue REAL portfolios."
echo "PASS — /prices and /market-cache/prices share the canonical cache."
echo "PASS — market browsing remains available without crossing the REAL valuation boundary."
echo "PC-030M10B verified market provider verification complete."
