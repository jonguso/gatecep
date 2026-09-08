# PC-030M20T — Investor Navigation Consolidation

GateCEP now presents one investor journey instead of repeating the same links
on Home, Coach Insights, and Portfolio Analysis.

1. Home shows verified portfolio facts and one Coach Insights handoff.
2. Coach Insights owns the ordered detail path: Portfolio Analysis,
   Performance, Portfolio Risk, Holdings, Goals, and Activity evidence.
3. Coach G Recommendations is the final advisory-only destination.

Duplicate Home route grids, Coach Analysis Center cards, recommendation
simulation content, and the Portfolio Analysis Specialist step are no longer
investor-facing. Their underlying routes and calculation engines are preserved.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20t-investor-navigation-consolidation.sh
npx expo start --clear --lan
```
