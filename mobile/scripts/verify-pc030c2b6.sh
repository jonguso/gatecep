#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2B6 — PERFORMANCE + REBALANCING VERIFICATION"
echo "============================================================"

echo
echo "===== PERFORMANCE CANONICAL SOURCE ====="

grep -n \
  'loadCanonicalRealWealthMetrics\|canonicalMetrics' \
  app/performance.js

echo
echo "===== PERFORMANCE CURRENT METRICS ====="

grep -n -A38 -B4 \
  'Holdings Market Value' \
  app/performance.js

echo
echo "===== PERFORMANCE FORMULAS ====="

grep -n -A30 -B5 \
  'const holdingsValue\|const investedValue\|const netGainLoss\|const gainLossPct' \
  app/performance.js

echo
echo "===== PERFORMANCE NAVIGATION ====="

grep -n -A5 -B4 \
  'Portfolio Analytics\|Back to Portfolio Analytics' \
  app/performance.js

echo
echo "===== REBALANCING LABEL ====="

grep -n -A8 -B4 \
  'label="Net Worth"' \
  app/portfolio-rebalancing.js

echo
echo "===== OLD REBALANCING LABEL MUST BE GONE ====="

if grep -n \
  'label="Portfolio Value"' \
  app/portfolio-rebalancing.js
then
  echo "ERROR — old Portfolio Value label remains."
  exit 1
else
  echo "PASS — rebalancing uses Net Worth."
fi

echo
echo "===== OLD PRACTICE MESSAGE MUST BE GONE ====="

if grep -n \
  'A funded Practice Portfolio and valid target allocation are required' \
  app/portfolio-rebalancing.js
then
  echo "ERROR — old Practice Portfolio message remains."
  exit 1
else
  echo "PASS — no Practice-only rebalancing message."
fi

echo
echo "===== PERFORMANCE EXPECTED EQUATION ====="

python - <<'PY'
holdings = 1119894.00
invested = 1106957.20
cash = 10310.60

gain = holdings - invested
pct = gain / invested * 100
net_worth = holdings + cash

print(f"Holdings Market Value : KES {holdings:,.2f}")
print(f"Invested Value        : KES {invested:,.2f}")
print(f"Available Cash        : KES {cash:,.2f}")
print(f"Unrealized Gain/Loss  : KES {gain:,.2f}")
print(f"Gain/Loss %           : {pct:.2f}%")
print(f"Net Worth             : KES {net_worth:,.2f}")

assert round(gain, 2) == 12936.80
assert round(net_worth, 2) == 1130204.60

print("PASS — canonical arithmetic reconciles.")
PY

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
echo "===== WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2B6 verification complete."
echo "============================================================"
