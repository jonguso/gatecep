# PC-030M20AI — CDSC Monthly Position Register & Date-Aware Reconciliation

Purpose: make the end-of-month CDSC statement the authoritative settled-position checkpoint while preserving broker valuation as point-in-time valuation evidence and broker transaction history as the cost-bearing/FIFO evidence source.

Integrity rules:
- A CDSC statement creates a dated monthly checkpoint; a later month does not overwrite an earlier month.
- Within a statement: opening balance + purchases - sales = closing balance.
- Across statements: previous closing balance should equal next opening balance.
- Reconciliation accepts split CDSC rows vs aggregated broker transactions when security + settlement date + side totals agree.
- Broker transaction rows retain their own execution/average price and fees; GateCEP does not invent prices for CDSC sub-rows.
- CDSC registered quantity and broker valuation quantity reconcile independently from transaction-history/FIFO integrity.
- A transaction-history gap cannot change the authoritative current position and continues to block FIFO until underlying evidence is repaired.
- No fabricated adjustment shares and no REAL/Practice portfolio mutation.

New mobile files:
- `mobile/src/features/trading/monthlyPositionRegisterService.js`
- `mobile/app/cdsc-position-register.js`
- `mobile/scripts/test-pc030m20ai-monthly-position-register.mjs`
- `mobile/scripts/verify-pc030m20ai-monthly-position-register.sh`

Updated mobile files:
- `mobile/src/features/trading/transactionLedgerReconciliationService.js`
- `mobile/app/transactions.js`

Updated backend file:
- `backend/src/services/brokerReports/brokerPdfExtraction.service.js`
  - recognizes `cdsc_positions`
  - extracts statement period, account number, security, opening/closing balances, purchases and sales

UAT focus:
1. Upload an end-of-month CDSC PDF at `/cdsc-position-register`.
2. Save the monthly checkpoint.
3. Open `/transactions?symbol=JUB`.
4. Confirm position integrity is separated from transaction-history integrity.
5. Confirm split CDSC movements can match aggregated broker transaction rows by settlement date.
