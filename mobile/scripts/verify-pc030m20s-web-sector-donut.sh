#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20S — WEB SECTOR DONUT"
echo "============================================================"
node scripts/test-pc030m20s-web-sector-donut.mjs
node --check src/features/portfolio-home/PortfolioHomeScreen.js
echo "PC-030M20S web sector donut verification complete."
