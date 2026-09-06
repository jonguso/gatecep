# PC-030M20P — Production News and Calendar

## Cause

The production backend exposed `/verified-news` and `/verified-news/calendar`, but `npm start` did not run the database migrations. Consequently, deployed PostgreSQL could be missing `verified_news_items` and `verified_calendar_events` even though both migrations existed in source control.

## Fix

- `npm start` now invokes the existing idempotent migration runner through `prestart`.
- Migration `010` creates the verified-news tables and indexes.
- Migration `011` creates the verified-calendar table and index.
- When collection is enabled, the existing scheduler performs an immediate verified collection at backend startup.

## Required Railway variables

```text
NEWS_COLLECTION_ENABLED=true
APIFY_API_TOKEN=<backend-only Apify token>
APIFY_NEWS_ACTOR_ID=apify/rag-web-browser
NEWS_COLLECTION_INTERVAL_MS=21600000
```

Do not place `APIFY_API_TOKEN` in the mobile application or any `EXPO_PUBLIC_` variable.

## Verify

From `backend`:

```bash
bash scripts/verify-pc030m20p-production-news-calendar.sh
npm start
```

After deployment, the backend log must show migrations `010` and `011` before `Gatecep backend running`, followed by `Verified news scheduler: running=true`.
