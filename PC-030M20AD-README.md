# PC-030M20AD — FIFO Lot Ledger

This increment uses dated broker order history to identify the shares expected to leave a holding in a partial sale.

- Only completed executions create or consume lots. Rejected, expired and cancelled orders are excluded.
- BUY executions create chronological acquisition lots; SELL executions consume the oldest lots first in FIFO mode.
- The lot ledger must reconcile to the current broker quantity before Coach G provides an exact FIFO projection.
- When order history has prices but no acquisition charges, lot costs are transparently calibrated to the imported broker WAP.
- Coach G lists each purchase date, quantity and price expected to be sold first.
- Sale proceeds, charges and realized gain/loss remain separate from the projected remaining WAP.
- The Broker Action Plan carries the FIFO lot breakdown without affecting REAL or Practice records.

Verify from `mobile`:

```bash
bash scripts/verify-pc030m20ad-fifo-lot-ledger.sh
```
