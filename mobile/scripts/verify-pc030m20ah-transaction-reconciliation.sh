#!/usr/bin/env bash
set -euo pipefail

echo "PC-030M20AH Transaction History & Ledger Reconciliation Report"
node scripts/test-pc030m20ah-transaction-reconciliation.mjs

echo "Running prior FIFO/canonical regressions when present..."
for script in \
  scripts/verify-pc030m20ad-fifo-lot-ledger.sh \
  scripts/verify-pc030m20ae-required-transaction-history.sh \
  scripts/verify-pc030m20af-historical-security-lot-ledger.sh \
  scripts/verify-pc030m20ag-canonical-portfolio-ledger.sh; do
  if [[ -f "$script" ]]; then bash "$script"; fi
done

echo "PC-030M20AH verification complete."
