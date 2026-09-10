# PC-030M20AA — Preview-Only Average Cost

The Coach G weighted-average flow is now a compact, non-persistent scenario tool.

- Alert links open `AVERAGE_COST` mode rather than the normal Practice Trade flow.
- REAL holdings provide read-only quantity and weighted-average cost context.
- Scenario cash is editable and is not saved.
- A zero cash value never prevents the weighted-average calculation.
- Preview mode has no trade-confirmation action and cannot change a saved portfolio.
- Security selection uses a compact dropdown modal rather than rendering the entire NSE list in the page body.

Verify from `mobile`:

```bash
bash scripts/verify-pc030m20aa-preview-only-average-cost.sh
```
