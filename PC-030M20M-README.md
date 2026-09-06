# PC-030M20M — Logical Investor Navigation

This patch makes the REAL investor journey progressive and predictable:

- Home shows verified portfolio facts and the complete sector allocation.
- Sector rows are paged five at a time when a portfolio contains more sectors.
- Duplicate Allocation tabs and repeated largest-sector metrics are removed.
- The next steps appear in order: Portfolio Analysis, Coach G Insights, and Coach G Recommendations.
- Performance remains part of Portfolio Analysis, Risk is accessible from Coach G Insights, and Rebalancing remains advisory-only.
- Back returns to the actual previous page or section.
- Home remains a separate top-level action and the fallback when no history exists.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20m-logical-investor-navigation.sh
npx expo start --clear --lan
```
