#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M16D — CONTAINED WATCHLIST"
echo "============================================================"
node scripts/test-pc030m16d-contained-watchlist.mjs
echo "PC-030M16D contained Watchlist verification complete."
