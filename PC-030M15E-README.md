# PC-030M15E — NSE Corporate Actions Browser Collection

The official NSE corporate-actions URL currently fails with HTTP 500 when the Apify RAG Web Browser uses `raw-http`. This update routes only that direct NSE page through `browser-playwright`; general news searches retain the faster raw HTTP mode.

## Integrity controls

- Browser mode applies only to the explicit `NSE_CORPORATE_ACTIONS` query.
- News searches for NSE, Business Daily and Standard retain raw HTTP mode.
- Rows with a failed crawl state or HTTP status 400+ are rejected as `CRAWL_FAILED` before evidence normalization.
- Only allowlisted publisher URLs can enter verified news or calendar storage.
- The contextual `NSE` ticker rule and stale `NSE, BOC` replacement remain active.

## Install and verify

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m15e-nse-browser-collection-fix.zip

cd backend
bash scripts/verify-pc030m15a-verified-apify-news.sh
bash scripts/verify-pc030m15b-verified-calendar.sh
```

Run a fresh collection, then restart the backend so future scheduled collections use the browser-mode routing.
