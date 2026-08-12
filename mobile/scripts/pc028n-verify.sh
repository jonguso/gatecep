#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028N VERIFY ====="

grep -n \
  "PortfolioSourceProvider\|usePortfolioSource\|LivePortfolioSourceSelector\|LivePortfolioSourceStatus\|buildVisiblePortfolioMetrics" \
  src/features/portfolio-source/*.js \
  src/features/portfolio-source/components/*.js

echo
echo "PC-028N shared live-source layer is installed."
