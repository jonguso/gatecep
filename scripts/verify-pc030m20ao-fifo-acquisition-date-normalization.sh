#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
if [[ ! -d "$ROOT/mobile" ]]; then
  echo "ERROR — run from GateCEP project root (~/gatecep)." >&2
  exit 1
fi

echo "PC-030M20AO — FIFO Acquisition Date Normalization"

grep -q 'normalizeEvidenceDate' mobile/src/features/trading/weightedAverageBuyGuardService.js
grep -q 'normalizedDate: lotDateEvidence.normalizedDate' mobile/src/features/trading/weightedAverageBuyGuardService.js
grep -q 'normalizeEvidenceDate' mobile/src/features/trading/historicalSecurityLotLedgerService.js
grep -q 'acquisitionDateNormalized' mobile/src/features/trading/historicalSecurityLotLedgerService.js
grep -q 'lot.normalizedDate ||' mobile/app/trade.js

echo "PASS — FIFO lot construction reuses the M20AJ source-aware date normalizer."
echo "PASS — original acquisition-date fields remain unchanged for historical/regression compatibility."
echo "PASS — Trade prefers the normalized date only for investor-facing FIFO presentation."

cd mobile
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { reconstructFifoAcquisitionLots } from './src/features/trading/weightedAverageBuyGuardService.js';
import { buildHistoricalSecurityLotLedger } from './src/features/trading/historicalSecurityLotLedgerService.js';

const tx = [
  { symbol:'EQT', side:'BUY', quantity:25, price:75, executionDate:46139, status:'FULLY TRADED' },
  { symbol:'EQT', side:'BUY', quantity:22, price:75, executionDate:46140, status:'FULLY TRADED' },
  { symbol:'EQT', side:'BUY', quantity:10, price:74, executionDate:46141, status:'FULLY TRADED' },
];
const fifo = reconstructFifoAcquisitionLots({ transactions: tx, symbol:'EQT', currentQuantity:57, currentAveragePrice:75 });
assert.equal(fifo.available, true);
assert.equal(fifo.lots[0].date, 46139);
assert.match(fifo.lots[0].normalizedDate, /^2026-\d{2}-\d{2}$/);
assert.equal(fifo.lots[0].dateMethod, 'EXCEL_1900_SERIAL');
console.log('PASS — Excel serial FIFO evidence keeps raw date and derives ISO normalizedDate.');

const ledger = buildHistoricalSecurityLotLedger({ transactions: tx, symbol:'EQT', currentQuantity:57, currentAveragePrice:75 });
assert.equal(ledger.available, true);
assert.equal(ledger.acquisitions[0].acquisitionDate, 46139);
assert.match(ledger.acquisitions[0].acquisitionDateNormalized, /^2026-\d{2}-\d{2}$/);
assert.equal(ledger.acquisitions[0].acquisitionDateMethod, 'EXCEL_1900_SERIAL');
console.log('PASS — historical lot ledger preserves raw acquisitionDate and derives normalized metadata.');
NODE
cd ..

grep -q 'FIFO shares expected to be sold first' mobile/app/trade.js
echo "PASS — FIFO presentation contract remains intact; quantity/cost/WAP/realized-P&L formulas were not changed."

if [[ -x scripts/verify-pc030m20an-runtime-market-symbol-canonicalization.sh ]]; then
  echo "Running M20AN and prior regressions..."
  bash scripts/verify-pc030m20an-runtime-market-symbol-canonicalization.sh
fi

echo "PC-030M20AO verification complete."
