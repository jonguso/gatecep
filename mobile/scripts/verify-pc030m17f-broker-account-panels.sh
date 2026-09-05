#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M17F — BROKER ACCOUNT PANELS"
echo "============================================================"
node scripts/test-pc030m17f-broker-account-panels.mjs
echo "PC-030M17F broker account panel verification complete."
