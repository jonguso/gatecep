#!/usr/bin/env bash
set -euo pipefail

echo "PC-030M20AI — CDSC Monthly Position Register & Date-Aware Reconciliation"
node scripts/test-pc030m20ai-monthly-position-register.mjs

echo "Running M20AH and prior FIFO/canonical regressions when present..."
if [ -f scripts/verify-pc030m20ah-transaction-reconciliation.sh ]; then
  bash scripts/verify-pc030m20ah-transaction-reconciliation.sh
fi

echo "Checking CDSC PDF extraction support in backend package..."
if [ -f ../backend/src/services/brokerReports/brokerPdfExtraction.service.js ]; then
  grep -q 'cdsc_positions' ../backend/src/services/brokerReports/brokerPdfExtraction.service.js
  grep -q 'Balance Brought Forward' ../backend/src/services/brokerReports/brokerPdfExtraction.service.js
  grep -q 'Balance Carried Forward' ../backend/src/services/brokerReports/brokerPdfExtraction.service.js
  echo "PASS — backend PDF extractor recognizes CDSC monthly position statements."
else
  echo "INFO — backend source is not present beside mobile; mobile reconciliation tests still completed."
fi

echo "PC-030M20AI verification complete."
