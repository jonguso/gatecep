# PC-030M20L — Investor Dashboard Summary

This patch simplifies the REAL Portfolio dashboard around an investor-first information hierarchy:

- Account selection and verified price status share one compact utility row.
- Price coverage, source, and effective time open in an on-demand popup.
- The REAL net-worth card is compressed while retaining return, cash, holdings, and largest-sector facts.
- More of the initial viewport is available for allocation visualization and the top three sectors.
- Home retains one concise Coach G insight; detailed interpretation remains in Coach G Insights.

No REAL portfolio calculation, market evidence, or Practice isolation contract is changed.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20l-investor-dashboard-summary.sh
npx expo start --clear --lan
```
