#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M16B — MARKET ACTIVITY METRICS"
echo "============================================================"
node scripts/test-pc030m16b-market-activity-metrics.mjs
echo "PC-030M16B market activity metrics verification complete."
