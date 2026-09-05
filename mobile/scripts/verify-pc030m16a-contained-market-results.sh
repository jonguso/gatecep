#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "============================================================"
echo "PC-030M16A — CONTAINED MARKET RESULTS"
echo "============================================================"
node scripts/test-pc030m16a-contained-market-results.mjs
echo "PC-030M16A contained market results verification complete."
