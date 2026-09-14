# PC-031A3 — Shared Basket Execution Mode Contract

Purpose:
- Add a durable `PRACTICE | REAL` execution mode contract to trade baskets, basket executions, and generated orders.
- Preserve GateCEP Broker (`GATECEP_PRACTICE`) as the canonical Practice broker.
- Keep Coach Insights Practice-only.
- Preserve execution mode and broker metadata when the trade basket is edited/re-saved.
- Do NOT reconnect REAL broker routing yet.
- Do NOT call `placeBrokerOrder()`.
- Do NOT change REAL portfolio, cash, FIFO, reconciliation, or broker-evidence mutation rules.

Expected behavior after this patch:
- Coach Insights creates `PRACTICE` baskets with `brokerId: GATECEP_PRACTICE`.
- Basket execution inherits `executionMode`, `brokerId`, and `brokerAccountId`.
- Every order inherits the same execution metadata.
- Re-saving the basket preserves execution metadata.
- Existing callers using the old two-argument `saveTradeBasket(items, source)` signature remain compatible and default to PRACTICE.

Files changed:
- mobile/src/services/trade/tradeBasketStore.js
- mobile/src/services/trade/basketExecutionStore.js
- mobile/app/coach-insights.js
- mobile/app/trade-basket.js

Safety:
- No Git commit.
- No Git push.
- No broker submission.
- No REAL portfolio mutation.
