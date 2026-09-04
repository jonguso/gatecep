#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "============================================================"
echo "PC-030M15C — INTERACTIVE VERIFIED MARKET CALENDAR"
echo "============================================================"
node scripts/test-pc030m15c-interactive-market-calendar.mjs
echo "PC-030M15C interactive market calendar verification complete."
