#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== HIGH-VALUE FILES TO INSPECT ====="

for f in \
  src/services/trade/basketExecutionStore.js \
  src/services/trade/tradeBasketStore.js \
  src/features/decision-journal/decisionJournalStore.js \
  src/services/portfolio/syncStatus.js \
  app/trade-history.js \
  app/orders-review.js \
  app/orders-review\\.js \
  app/recommendation-history.js
do
  if [ -f "$f" ]; then
    echo
    echo "### $f"
    sed -n '1,260p' "$f"
  fi
done
