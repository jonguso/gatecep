#!/usr/bin/env bash
set -euo pipefail
echo "============================================================"
echo "PC-030M13E — DISTINCT MARKET RANKINGS"
echo "============================================================"
node scripts/test-pc030m13e-distinct-market-rankings.mjs
node scripts/test-pc030m10h-dynamic-market-universe.mjs
echo "PC-030M13E distinct market rankings verification complete."
