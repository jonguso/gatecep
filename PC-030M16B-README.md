# PC-030M16B — Market activity metrics

- Volume rows display verified traded-share volume.
- Turnover rows prefer provider-reported turnover.
- When turnover is absent, the UI derives `closing price × volume` and visibly labels it **Est. turnover**.
- Rankings, summary totals, contained scrolling, and Security Education navigation remain intact.

Run `bash scripts/verify-pc030m16b-market-activity-metrics.sh` from `mobile`.
