#!/usr/bin/env bash

cd ~/gatecep/mobile || exit 1

echo "============================================================"
echo "PC-030C2B7 — PERFORMANCE HISTORY DISCOVERY"
echo "============================================================"

echo
echo "===== PERFORMANCE SCREEN ====="

sed -n '1,280p' app/performance.js

echo
echo "===== SNAPSHOT SERVICE ====="

sed -n '1,320p' \
  src/portfolio/portfolioSnapshot.js

echo
echo "===== SNAPSHOT WRITERS ====="

grep -RniE \
  'savePortfolioSnapshot|portfolioSnapshots|healthScore|healthRating|snapshot' \
  app src \
  --include="*.js" \
  --include="*.jsx" \
  | head -n 420

echo
echo "===== HEALTH SCORE SOURCES ====="

grep -RniE \
  'buildPortfolioHealthScore|healthScore|healthRating' \
  src/features \
  app \
  --include="*.js" \
  --include="*.jsx" \
  | head -n 420

echo
echo "===== PERFORMANCE HISTORY SERVICES ====="

find src/features/performance \
  -type f \
  \( -name "*.js" -o -name "*.jsx" \) \
  -print \
  | sort

grep -RniE \
  'snapshot|history|return|performance|healthScore|healthRating|totalValue|currentValue|netWorth' \
  src/features/performance \
  --include="*.js" \
  --include="*.jsx" \
  | head -n 420

echo
echo "===== CURRENT PERFORMANCE FALLBACKS ====="

grep -nE \
  '\|\| 0|healthScore|healthRating|changePct|metrics.change|firstValue' \
  app/performance.js

echo
echo "============================================================"
echo "PC-030C2B7 DISCOVERY COMPLETE"
echo "============================================================"
