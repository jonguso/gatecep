#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M10E — AUTOMATIC PROVIDER TAKEOVER VERIFICATION"
echo "============================================================"

node scripts/test-pc030m10e-automatic-provider-takeover.mjs
node scripts/test-pc030m10d-apify-full-nse-market.mjs

node --check src/modules/market-cache/marketCache.service.js
node --check src/modules/market-cache/marketCache.scheduler.js

echo "PASS — automatic provider takeover source parses successfully."
echo "PC-030M10E automatic provider takeover verification complete."
