# PC-030M8C — Specialist Navigation Alignment

This increment aligns the Portfolio Analysis journey and its specialist screens.

- Executive Actions starts with **Risk**, rather than an undifferentiated All list.
- Portfolio Alerts starts with **Critical**, so urgent items appear first.
- Analysis preserves the Specialist Analysis parent when opening Risk, Performance, or Rebalancing.
- Risk and Performance details use three distinct controls: parent overview, previous detail, and next detail.
- The final detail returns to its specialist overview.
- Rebalancing returns to Specialist Analysis when it was opened from Analysis.

The long Rebalancing report is intentionally not converted into focused steps in this increment; that remains the next isolated UI change.

Run `bash scripts/verify-pc030m8c-specialist-navigation-alignment.sh`.
