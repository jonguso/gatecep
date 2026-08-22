# PC-030M10B — Verified Market Provider Boundary

This patch completes the backend half of automatic REAL portfolio valuation.

## What changes

- Adds a configurable `VERIFIED_HTTP` adapter for a genuine licensed NSE or broker quote endpoint.
- Adds the root `/prices` route expected by the mobile application while retaining `/market-cache/prices`.
- Requires explicit `valuationEligible: true`, genuine provider identity, usable positive prices, and a fresh upstream timestamp.
- Keeps `LOCAL_EOD` available for Markets browsing but prevents it from revaluing a REAL portfolio.
- Prevents the backend live-portfolio/Coach G path from applying unverified cached prices.
- Keeps quantities, average cost, cash, transactions, and broker evidence outside the market-price mutation boundary.

## Configure Railway/backend environment

```text
MARKET_DATA_PROVIDER=VERIFIED_HTTP
MARKET_DATA_PROVIDER_NAME=YOUR_LICENSED_NSE_OR_BROKER_PROVIDER
MARKET_DATA_URL=https://your-provider.example/nse/quotes
MARKET_DATA_API_KEY=your-secret-key
MARKET_DATA_API_KEY_HEADER=Authorization
MARKET_DATA_API_KEY_PREFIX=Bearer 
MARKET_DATA_MAX_AGE_MINUTES=30
MARKET_DATA_TIMEOUT_MS=12000
MARKET_CACHE_REFRESH_MS=60000
```

Do not commit the API key. Configure it in Railway variables or the backend's private local `.env`.

The upstream response may be an array or may contain `data`, `prices`, or `quotes`. Each quote should provide a symbol and a positive `lastPrice`, `currentPrice`, `price`, or `close`. The response must also provide `asOf`, `generatedAt`, or `updatedAt`.

Until a genuine endpoint and credentials are configured, GateCEP intentionally continues to display broker valuation with **Using last verified prices**.
