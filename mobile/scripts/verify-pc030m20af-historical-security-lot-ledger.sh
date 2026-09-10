#!/usr/bin/env bash
set -euo pipefail
echo "PC-030M20AF — HISTORICAL SECURITY LOT LEDGER"
node scripts/test-pc030m20ad-fifo-lot-ledger.mjs
node scripts/test-pc030m20ae-required-transaction-history.mjs
node scripts/test-pc030m20af-historical-security-lot-ledger.mjs
grep -q 'buildHistoricalSecurityLotLedger' app/trade.js
grep -q 'status: findValue(\["Order Status", "Status", "Execution Status", "Trade Status"\])' app/transaction-import.js
echo "PASS — Trade SELL simulation consumes the derived historical lot ledger, not a mutable simulated ledger."
echo "PC-030M20AF historical security lot ledger verification complete."
