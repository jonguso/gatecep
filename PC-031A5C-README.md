# PC-031A5C — REAL Proceed-to-Trade Handoff

Purpose:
- Reconnect the existing Average Cost / FIFO / fee decision-support flow to the shared OMS.
- Add a REAL `Proceed to Trade` action from Average Cost mode.
- Preserve Broker Action Plan as optional Save for Later only.
- Carry decision-support metadata into the REAL basket/order without treating it as execution evidence.
- Do not alter Average Cost, FIFO, fee, P&L, or guard calculations.
- Do not require a connected broker until the A4 routing boundary.
- Do not mutate REAL holdings, cash, P&L, FIFO, or broker evidence.

Target lifecycle:
Average Cost / FIFO / fee analysis
  -> Proceed to Trade
  -> REAL basket
  -> REAL basket execution (REVIEW)
  -> REAL Orders Review
  -> Queue
  -> A4 mode-aware broker routing

Safety:
- No direct `placeBrokerOrder()` from trade.js.
- No REAL fill.
- No REAL portfolio mutation.
- No commit.
- No push.
