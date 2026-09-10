# PC-030M20AF — Historical Security Lot Ledger

UAT enhancement extending the M20AD FIFO sale work and M20AE required transaction-history evidence.

- `transactionHistory` remains the canonical broker execution evidence source.
- Completed executions only (`FULLY TRADED`, `FILLED`, `COMPLETED`, `SETTLED`) may create/consume lots.
- Rejected, refused, cancelled/canceled, expired, or otherwise non-completed orders cannot affect the ledger.
- Historical BUYs create acquisition lots; historical SELLs consume open lots FIFO.
- An unmatched historical SELL creates `UNMATCHED_HISTORICAL_SALE`; GateCEP does not invent an opening lot.
- Current broker quantity is independently reconciled to derived open lots.
- Broker WAP calibration continues to reuse the proven M20AD reconstruction logic.
- Proposed Coach G BUY/SELL scenarios are analytical only. They do not consume ledger lots and do not mutate REAL or Practice portfolios.
- Broker Action Plan remains advisory handoff only; REAL changes require subsequent broker execution evidence.
