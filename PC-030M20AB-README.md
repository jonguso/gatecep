# PC-030M20AB — Sale Guard & Broker Action Plan

This increment extends the Average Cost Simulator to BUY and SELL scenarios.

- SELL estimates deduct the displayed brokerage and regulatory charges.
- Coach G shows net proceeds per share, released cost basis, estimated realized gain/loss, and the minimum gross sale limit that avoids an estimated cost-basis loss.
- The weighted average of remaining shares stays unchanged under average-cost accounting; realized sale results are presented separately.
- A scenario may be saved to a separate Broker Action Plan and shared as a manual broker handoff report.
- A Broker Action Plan cannot route, fill, or mutate REAL/Practice holdings, cash, cost basis, profit/loss, or trade history.
- REAL values change only after confirmed broker activity is imported and reconciled.

Verify from `mobile`:

```bash
bash scripts/verify-pc030m20ab-sale-guard-broker-plan.sh
```
