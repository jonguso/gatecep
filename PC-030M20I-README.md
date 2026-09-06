# PC-030M20I — Dynamic Portfolio Panels

This patch balances the two principal mobile portfolio screens:

- The dashboard net-worth card compresses on phone-height viewports.
- The dashboard tab panel uses the vertical space remaining after its visible summary cards.
- Holdings expands its contained securities panel to 62% of the viewport, bounded between 380 and 720 points.
- Long holdings remain internally scrollable, so the global navigation stays stable.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20i-dynamic-portfolio-panels.sh
npx expo start --clear --lan
```
