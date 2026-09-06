#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20N — SECTOR DRILL-DOWN FIX"
echo "============================================================"
node scripts/test-pc030m20n-sector-drilldown-fix.mjs
echo "PC-030M20N sector drill-down verification complete."

