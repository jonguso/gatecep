# PC-030M10D — Apify Full NSE Market

This patch switches the documented Apify source to the Mansa Labs African Stock Market Data Actor and configures its full NSE stock dataset.

## Environment

Keep the token private and configure these values independently in local `.env` and Railway Variables:

```env
MARKET_DATA_PROVIDER=APIFY_NSE
APIFY_ACTOR_ID=mansalabs/african-stock-market-data
APIFY_ACTOR_INPUT_JSON={"dataset":"stocks","exchangeCode":"NSE"}
MARKET_DATA_MAX_AGE_MINUTES=30
MARKET_DATA_CLOSED_MAX_AGE_MINUTES=5760
```

`APIFY_API_TOKEN` remains required but is intentionally not included in this package.

## Valuation boundary

- Only positive-price NSE rows are accepted.
- `scraped_at` remains the authoritative quote timestamp; `retrieved_at` does not make an old quote current.
- During NSE trading, the strict intraday freshness limit applies.
- Outside the trading session, the most recent verified close may remain available for up to the configured closed-market window.
- Broker quantities, cost basis, and cash are never modified by market prices.
- Missing or rejected quotes retain broker valuation evidence.

## Verify

From `~/gatecep/backend`:

```bash
chmod +x scripts/verify-pc030m10d-apify-full-nse-market.sh
bash scripts/verify-pc030m10d-apify-full-nse-market.sh
```
