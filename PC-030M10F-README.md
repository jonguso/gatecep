# PC-030M10F — Local Verified EOD

GateCEP now uses a PostgreSQL-backed verified end-of-day snapshot as its default portfolio valuation provider. Apify is called only by the daily collector after the NSE close. myStocks is no longer restored during backend startup.

## Install

From `~/gatecep`:

```bash
unzip -o ~/Downloads/gatecep-pc030m10f-local-verified-eod.zip
cd backend
npm run migrate
chmod +x scripts/verify-pc030m10f-local-verified-eod.sh
bash scripts/verify-pc030m10f-local-verified-eod.sh
```

## Environment

Configure the same values locally and in Railway Variables:

```env
MARKET_DATA_PROVIDER=LOCAL_EOD
MARKET_EOD_UPSTREAM_PROVIDER=APIFY_NSE
MARKET_EOD_COLLECTION_HOUR=15
MARKET_EOD_COLLECTION_MINUTE=20
MARKET_EOD_MINIMUM_QUOTES=40
MARKET_EOD_SCHEDULER_CHECK_MS=900000
MARKET_EOD_COLLECTION_RETRY_MS=3600000
APIFY_ACTOR_ID=mansalabs/african-stock-market-data
APIFY_ACTOR_INPUT_JSON={"dataset":"stocks","exchangeCode":"NSE"}
MARKET_DATA_MAX_AGE_MINUTES=30
MARKET_DATA_CLOSED_MAX_AGE_MINUTES=5760
```

Keep `APIFY_API_TOKEN` private and configured only in backend environment variables.

## Runtime behavior

1. Portfolio valuation loads the latest verified EOD snapshot from PostgreSQL.
2. On weekdays after 15:20 Africa/Nairobi time, the scheduler checks whether today's snapshot exists.
3. If missing, the collector runs the full-market Apify Actor once, requires at least 40 valid NSE prices, and stores them transactionally.
4. Further checks that day do not call Apify again.
5. If collection fails, the previous verified EOD snapshot remains active.
6. Securities without a verified EOD quote retain broker valuation evidence.

An authenticated administrative collection is available at `POST /market-cache/eod/collect` with the normal bearer token and `x-market-import-key` header.
