# PC-030M6B — Focused Portfolio Analysis

Unified Portfolio Analytics is now presented as **Portfolio Analysis**, using the same mobile parent/detail pattern as Performance.

## Parent experience

- Compact health hero and portfolio metrics.
- Seven tappable analysis destinations in a two-column mobile grid.
- Home is the canonical parent exit.
- Refresh and the read-only protection notice remain on the parent.

## Focused destinations

1. Executive Health
2. Analytics Scorecard
3. Executive Actions
4. Portfolio Alerts
5. Holdings Analytics
6. Broker & Operations
7. Specialist Analysis

Only the selected destination renders. Every detail has **Back to Portfolio Analysis** at the top and bottom.

Performance’s overview button and footer now return to Home. A selected Performance detail still returns to Performance first.

The existing REAL analytics, health-score, executive-action, filtering, and fail-closed contracts are preserved.

## Verify

```bash
chmod +x scripts/verify-pc030m6b-focused-portfolio-analysis.sh
bash scripts/verify-pc030m6b-focused-portfolio-analysis.sh
```
