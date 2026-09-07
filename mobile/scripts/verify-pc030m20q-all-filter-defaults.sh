#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20Q — ALL FILTER DEFAULTS"
echo "============================================================"
node scripts/test-pc030m20q-all-filter-defaults.mjs
echo "PC-030M20Q All filter defaults verification complete."
