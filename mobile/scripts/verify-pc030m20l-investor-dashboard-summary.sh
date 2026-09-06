#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20L — INVESTOR DASHBOARD SUMMARY"
echo "============================================================"
node scripts/test-pc030m20l-investor-dashboard-summary.mjs
echo "PC-030M20L investor dashboard summary verification complete."

