# PC-030M20AQ3 — Trading / Decision Lab UI Consolidation

This is a narrow render-only cleanup for `mobile/app/(tabs)/trading.js` after M20AQ2.

Changes:
- Moves the existing `ActiveUserBanner` above Coach G Decision Lab.
- Replaces the obsolete broker-evidence subtitle with Decision Lab wording when that subtitle block exists.
- Removes the lower Broker Evidence / Broker controlled / Account-Orders-Depth-Activity workspace from the Trading page render.
- Keeps the underlying broker handlers, routes, stores and services in source; this patch does not delete broker capability.
- Keeps Decision Lab BUY/SELL, goal/recovery and Broker Action Plan handoff intact.
- Does not alter FIFO, WAP, REAL/Practice holdings, CDSC, transaction evidence, cash ledger, goal math or recovery math.

Apply from the GateCEP repository root:

```bash
chmod +x scripts/apply-pc030m20aq3-trading-ui-consolidation.sh
chmod +x scripts/verify-pc030m20aq3-trading-ui-consolidation.sh
bash scripts/apply-pc030m20aq3-trading-ui-consolidation.sh
bash scripts/verify-pc030m20aq3-trading-ui-consolidation.sh
```
