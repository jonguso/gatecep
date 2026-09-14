# PC-031A5C-R1 — REAL Proceed-to-Trade Handoff Repair

This repair completes only the missing `mobile/app/trade.js` portion of PC-031A5C.

Why the first A5C apply stopped:
- `trade.js` imports `basketExecutionStore` from the legacy compatibility wrapper
  `../src/trade/basketExecutionStore`, not directly from `../src/services/trade/basketExecutionStore`.

Already-applied A5C metadata changes are preserved:
- `tradeBasketStore` keeps `decisionSupport`.
- `basketExecutionStore` carries `decisionSupport` into execution orders.

This repair:
- imports `createBasketExecution` through the existing compatibility wrapper;
- imports `saveTradeBasket` through the trade basket compatibility wrapper;
- adds REAL `Proceed to Trade`;
- keeps Broker Action Plan as optional Save for Later;
- enters REAL Orders Review before queue/routing;
- does not alter Average Cost/FIFO/fee calculations;
- does not call a broker directly;
- does not mutate REAL holdings/cash/FIFO.
