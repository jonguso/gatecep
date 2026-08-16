# PC-030M5C — Interactive, Informative Allocation

This patch restores the useful allocation-chart behavior from the earlier Portfolio Hub while preserving the mobile-first Home introduced in M5A/M5B.

## Restored behavior

- Every colored donut slice opens the same sector-securities modal as its row.
- Percentage labels are rendered around the donut.
- The donut center shows the exact portfolio value rather than only a compact value.
- Largest sector, largest-sector weight, and diversification are visible above the chart.
- Chart labels ignore pointer events so they cannot block sector taps.
- Native sector rows remain available as a second, accessible interaction path.

## Verify

```bash
chmod +x scripts/verify-pc030m5c-interactive-allocation.sh
bash scripts/verify-pc030m5c-interactive-allocation.sh
```
