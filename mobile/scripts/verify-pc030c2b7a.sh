#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2B7A — PERFORMANCE HISTORY VERIFICATION"
echo "============================================================"

echo
echo "===== CURRENT HEALTH ENGINE ====="

grep -n \
  'buildPortfolioHealthScore\|currentHealth' \
  app/performance.js

echo
echo "===== HISTORICAL COMPARISON ====="

grep -n -A35 -B5 \
  'hasHistoricalComparison' \
  app/performance.js

echo
echo "===== CHANGE SINCE FIRST SNAPSHOT ====="

grep -n -A18 -B4 \
  'Change Since First Snapshot' \
  app/performance.js

echo
echo "===== CURRENT HEALTH SCORE UI ====="

grep -n -A18 -B4 \
  'label="Health Score"' \
  app/performance.js

echo
echo "===== SNAPSHOT HEALTH UI ====="

grep -n -A12 -B5 \
  's.healthScore !== null' \
  app/performance.js

echo
echo "===== INVALID ZERO FALLBACKS ====="

if grep -n \
  'metrics.latest.healthScore || 0' \
  app/performance.js
then
  echo "ERROR — current Health Score still falls back to 0."
  exit 1
else
  echo "PASS — current Health Score does not invent zero."
fi

if grep -nE \
  's\.healthScore[[:space:]]*\|\|[[:space:]]*0' \
  app/performance.js
then
  echo "ERROR — snapshot Health still falls back to 0."
  exit 1
else
  echo "PASS — historical snapshot Health does not invent zero."
fi

echo
echo "===== BACKUPS INSIDE APP ====="

COUNT="$(
  find app \
    -type f \
    -iname '*bak*' \
    | wc -l
)"

echo "Count: $COUNT"

if [ "$COUNT" -ne 0 ]; then
  find app -type f -iname '*bak*'
  exit 1
fi

echo
echo "===== ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2B7A verification complete."
echo "============================================================"
