#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20T — INVESTOR NAVIGATION CONSOLIDATION"
echo "============================================================"
node scripts/test-pc030m20t-investor-navigation-consolidation.mjs
node --check src/features/portfolio-home/PortfolioHomeScreen.js
node --check 'app/(tabs)/coach.js'
node --check app/unified-portfolio-analytics.js
node --check app/portfolio-rebalancing.js
echo "PC-030M20T investor navigation consolidation verification complete."
