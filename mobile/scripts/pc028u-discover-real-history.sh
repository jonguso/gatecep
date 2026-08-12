#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-028U — REAL HISTORY SOURCE DISCOVERY"
echo "============================================================"
echo

echo "===== RECOMMENDATION HISTORY CANDIDATES ====="
grep -Rni \
  "recommendationHistory\|recommendation.*store\|load.*Recommendation\|get.*Recommendation\|save.*Recommendation\|Coach G.*recommend" \
  src app \
  --include="*.js" \
  --include="*.jsx" \
  | grep -v "PC-028" \
  | head -n 220 || true

echo
echo "===== ORDER HISTORY CANDIDATES ====="
grep -Rni \
  "orderHistory\|load.*Order\|get.*Order\|executionOrders\|execution.*store\|order.*store\|filledQuantity\|averageFillPrice" \
  src app \
  --include="*.js" \
  --include="*.jsx" \
  | grep -v "PC-028" \
  | head -n 260 || true

echo
echo "===== TRADE HISTORY CANDIDATES ====="
grep -Rni \
  "tradeHistory\|transactionHistory\|load.*Trade\|get.*Trade\|load.*Transaction\|get.*Transaction\|trade.*store\|transaction.*store" \
  src app \
  --include="*.js" \
  --include="*.jsx" \
  | grep -v "PC-028" \
  | head -n 260 || true

echo
echo "===== PRACTICE / SIMULATION EXCLUSION CANDIDATES ====="
grep -Rni \
  "isPractice\|PRACTICE_ONLY\|SIMULATION\|simulationBroker\|practiceDecisionJournal" \
  src/services/trade \
  src/features \
  app/trade-history.js \
  app/orders-review.js \
  app/orders-review\\.js \
  2>/dev/null \
  --include="*.js" \
  --include="*.jsx" \
  | head -n 220 || true

echo
echo "===== KNOWN STORAGE KEYS ====="
grep -Rni \
  'userGetItem("transactionHistory"\|userGetItem(".*order\|userGetItem(".*trade\|userGetItem(".*recommend' \
  src \
  --include="*.js" \
  --include="*.jsx" \
  | head -n 220 || true

echo
echo "===== EXPORTS FROM LIKELY STORES ====="
for f in \
  src/services/trade/*.js \
  src/features/*/*Store.js \
  src/features/*/*History*.js \
  src/features/*/*Recommendation*.js
do
  [ -f "$f" ] || continue

  if grep -Eqi \
    "order|trade|transaction|recommendation|execution" \
    "$f"
  then
    echo
    echo "--- $f ---"

    grep -n \
      "^export\\|export async function\\|export function" \
      "$f" \
      | head -n 100 || true
  fi
done

echo
echo "============================================================"
echo "DISCOVERY COMPLETE"
echo "============================================================"
