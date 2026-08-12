#!/usr/bin/env bash
set -e
cd ~/gatecep/mobile

echo "===== PC-028O SERVICE ====="
grep -n   "buildCanonicalRealWealthMetrics\|loadCanonicalRealWealthMetrics\|REAL_NET_WORTH\|selectorIndependent"   src/features/wealth-journey/canonicalRealWealthMetricsService.js

echo
echo "===== PC-028O DASHBOARD ====="
grep -n   "canonicalRealWealth\|realGoalCurrentValue\|Real Investment Net Worth\|Practice Portfolio Value"   app/'(tabs)'/dashboard.js

echo
echo "===== SYNTAX ====="
node --check src/features/wealth-journey/canonicalRealWealthMetricsService.js
node --check app/'(tabs)'/dashboard.js

echo
echo "PC-028O verification complete."
