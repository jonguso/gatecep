#!/usr/bin/env bash
set -euo pipefail
node scripts/test-pc030m20ad-fifo-lot-ledger.mjs
node scripts/test-pc030m20ae-required-transaction-history.mjs
node scripts/test-pc030m20af-historical-security-lot-ledger.mjs
node scripts/test-pc030m20ag-canonical-portfolio-ledger.mjs
printf '\nPC-030M20AG canonical portfolio ledger verification complete.\n'
