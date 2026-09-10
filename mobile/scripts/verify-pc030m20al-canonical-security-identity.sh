#!/usr/bin/env bash
set -euo pipefail
echo "PC-030M20AL — Canonical Security Identity & Symbol Alias Normalization"
node scripts/test-pc030m20al-canonical-security-identity.mjs
echo "Static canonical-identity integration checks..."
grep -q 'canonicalSecuritySymbol' src/features/trading/monthlyPositionRegisterService.js
grep -q 'canonicalSecuritySymbol' src/features/trading/transactionLedgerReconciliationService.js
grep -q 'canonicalSecuritySymbol' src/features/trading/historicalSecurityLotLedgerService.js
grep -q 'canonicalSecuritySymbol' src/features/trading/canonicalPortfolioLedgerService.js
echo "Running M20AK and prior regressions when present..."
[ -f scripts/test-pc030m20ak-historical-cdsc-chain.mjs ] && node scripts/test-pc030m20ak-historical-cdsc-chain.mjs
[ -f scripts/test-pc030m20aj-transaction-date-anchor-window.mjs ] && node scripts/test-pc030m20aj-transaction-date-anchor-window.mjs
[ -f scripts/test-pc030m20ai-monthly-position-register.mjs ] && node scripts/test-pc030m20ai-monthly-position-register.mjs
[ -f scripts/test-pc030m20ah-transaction-reconciliation.mjs ] && node scripts/test-pc030m20ah-transaction-reconciliation.mjs
[ -f scripts/test-pc030m20ad-fifo-lot-ledger.mjs ] && node scripts/test-pc030m20ad-fifo-lot-ledger.mjs
[ -f scripts/test-pc030m20ae-required-transaction-history.mjs ] && node scripts/test-pc030m20ae-required-transaction-history.mjs
[ -f scripts/test-pc030m20af-historical-security-lot-ledger.mjs ] && node scripts/test-pc030m20af-historical-security-lot-ledger.mjs
[ -f scripts/test-pc030m20ag-canonical-portfolio-ledger.mjs ] && node scripts/test-pc030m20ag-canonical-portfolio-ledger.mjs
echo "PC-030M20AL verification complete."
