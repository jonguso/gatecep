#!/usr/bin/env bash
set -euo pipefail

echo "PC-030M20AJ — Transaction Date Normalization & Anchor-Window Reconciliation"
node scripts/test-pc030m20aj-transaction-date-anchor-window.mjs

echo "Running M20AI and prior reconciliation/FIFO regressions when present..."
for script in \
  scripts/test-pc030m20ai-monthly-position-register.mjs \
  scripts/test-pc030m20ah-transaction-reconciliation.mjs \
  scripts/test-pc030m20ad-fifo-lot-ledger.mjs \
  scripts/test-pc030m20ae-required-transaction-history.mjs \
  scripts/test-pc030m20af-historical-security-lot-ledger.mjs \
  scripts/test-pc030m20ag-canonical-portfolio-ledger.mjs
  do
    if [[ -f "$script" ]]; then node "$script"; fi
  done

echo "Static integrity checks..."
grep -q 'EXCEL_1900_SERIAL' src/features/trading/transactionDateNormalizationService.js
grep -q 'ANCHOR_WINDOW_RECONCILED' src/features/trading/monthlyPositionRegisterService.js
grep -q 'SETTLEMENT_WINDOW_RECONCILED' src/features/trading/monthlyPositionRegisterService.js
grep -q 'CDSC ↔ Broker Date Buckets' app/transactions.js
grep -q 'Normalized Date' app/transactions.js

echo "PC-030M20AJ verification complete."
