# PC-030M12D — Unified Apify EOD Import

GateCEP now accepts either CSV or JSON exports from the Apify African Stock Market Data actor. Both formats pass through one canonical normalizer and publish confirmed full-market evidence to PostgreSQL as `LOCAL_VERIFIED_EOD`.

## Integrity rules

- `scraped_at` is the authoritative upstream timestamp.
- Only positive NSE prices are accepted.
- At least `MARKET_EOD_MINIMUM_QUOTES` prices are required.
- CSV and JSON versions of the same dataset share one canonical checksum.
- Older snapshots are rejected and equivalent snapshots are not duplicated.
- PostgreSQL `DATE` values are normalized to `YYYY-MM-DD` before stale-snapshot comparison.
- Imports update price evidence only; holdings, quantity, cost basis, and broker cash remain unchanged.
