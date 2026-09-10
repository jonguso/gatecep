#!/usr/bin/env bash
set -euo pipefail
echo "============================================================"
echo "PC-030M20AE — REQUIRED TRANSACTION HISTORY"
echo "============================================================"
node scripts/test-pc030m20ae-required-transaction-history.mjs
echo "PC-030M20AE required transaction history verification complete."
