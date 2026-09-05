#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M17G — ORDER + HISTORY PANELS"
echo "============================================================"
node scripts/test-pc030m17g-order-history-panels.mjs
echo "PC-030M17G order and history panel verification complete."
