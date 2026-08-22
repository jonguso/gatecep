#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M10A — AUTOMATIC NSE MARKET PRICE VERIFICATION"
echo "============================================================"

node scripts/test-pc030m10a-live-market-price-overlay.cjs

grep -q 'fetch(`${API_URL}/prices' src/services/markets/canonicalNseQuoteService.js
grep -q 'UNVERIFIED_PRICE_SOURCE' src/services/markets/canonicalNseQuoteService.js
grep -q 'overlayCanonicalNseQuotes' src/services/portfolio/unifiedPortfolioApi.js
grep -q 'calculatePortfolioSummary' src/services/portfolio/unifiedPortfolioApi.js
grep -q 'isNseMarketSessionOpen' src/features/portfolio-home/PortfolioHomeScreen.js
grep -q '60 \* 1000' src/features/portfolio-home/PortfolioHomeScreen.js

node - <<'NODE'
const fs = require('fs');
const babel = require('@babel/core');
for (const filename of [
  'src/services/markets/canonicalNseQuoteService.js',
  'src/services/portfolio/unifiedPortfolioApi.js',
  'src/features/portfolio-home/PortfolioHomeScreen.js'
]) {
  babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    babelrc: false,
    configFile: false,
    presets: [require.resolve('babel-preset-expo')]
  });
}
console.log('PASS — market-price integration source parses successfully.');
NODE

echo "PASS — REAL positions remain broker-controlled while current valuation uses verified market quotes."
echo "PASS — synthetic market feeds cannot revalue a REAL portfolio."
echo "PASS — refreshed totals propagate through the canonical REAL portfolio response."
echo "PC-030M10A automatic NSE market price verification complete."
