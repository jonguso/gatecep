# PC-030M20N — Sector Drill-Down Fix

This corrective patch aligns the compact REAL Portfolio dashboard with the intended investor hierarchy:

- The summary shows Cash and total Sectors; the duplicated Largest metric is removed.
- The Sector Allocation header shows the largest sector and its portfolio weight.
- Donut-chart taps are resolved at the SVG chart level for reliable Android and iOS touch handling.
- Tapping a donut wedge or sector row opens the corresponding securities popup.
- Five-row sector pagination and the logical investor browsing sequence remain unchanged.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20n-sector-drilldown-fix.sh
npx expo start --clear --lan
```
