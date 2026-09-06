# PC-030M20K — Dynamic Analysis Panels

This patch extends the mobile viewport-sizing behavior to the investor analysis journeys:

- Portfolio Analysis
- Portfolio Risk
- Performance
- Portfolio Rebalancing

Each focused detail panel now uses 62% of the current viewport height, bounded between 380 and 720 points. The panel recalculates when the device size or orientation changes and retains its own internal scrolling, keeping global navigation stable.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20k-dynamic-analysis-panels.sh
npx expo start --clear --lan
```
