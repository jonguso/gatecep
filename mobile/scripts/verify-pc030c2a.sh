#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PORTFOLIO HUB SPECIALIST DESTINATIONS ====="

grep -n -A45 -B5 \
  'Portfolio Tools' \
  app/portfolio-hub.js

echo
echo "===== ANALYTICS SPECIALIST DESTINATIONS ====="

grep -n -A50 -B5 \
  'Specialist Analysis' \
  app/unified-portfolio-analytics.js

echo
echo "===== REQUIRED ROUTES FROM PORTFOLIO HUB ====="

for route in \
  /holding-details \
  /performance \
  /portfolio-activity \
  /unified-portfolio-analytics
do
  if grep -q "\"$route\"" app/portfolio-hub.js; then
    echo "PASS $route"
  else
    echo "FAIL $route"
    exit 1
  fi
done

echo
echo "===== REQUIRED ANALYTICS DRILL-DOWNS ====="

for route in \
  /portfolio-risk \
  /performance \
  /portfolio-rebalancing \
  /portfolio-hub
do
  if grep -q "\"$route\"" app/unified-portfolio-analytics.js; then
    echo "PASS $route"
  else
    echo "FAIL $route"
    exit 1
  fi
done

echo
echo "===== ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

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
echo "PC-030C2A verification complete."
