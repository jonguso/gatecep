#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M19E — CONNECTED BROKER CASH LOCK"
echo "============================================================"
node scripts/test-pc030m19e-connected-broker-cash-lock.mjs
echo "PC-030M19E connected broker cash lock verification complete."
