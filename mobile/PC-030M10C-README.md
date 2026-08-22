# PC-030M10C — Apify NSE live-price provider

This patch connects the backend market cache to the Apify Actor `wafspaul~nse-kenya-market-data`. The mobile app continues to read only GateCEP's backend `/prices` cache; it never receives the Apify token and never starts a paid Actor run.

## Backend configuration

Add these values to the deployed backend environment (do not use `EXPO_PUBLIC_`):

```env
MARKET_DATA_PROVIDER=APIFY_NSE
APIFY_ACTOR_ID=wafspaul~nse-kenya-market-data
APIFY_API_TOKEN=your-secret-token
APIFY_ACTOR_INPUT_JSON={}
APIFY_RUN_TIMEOUT_SECONDS=180
APIFY_MAX_ITEMS=500
APIFY_MAX_TOTAL_CHARGE_USD=0.25
MARKET_DATA_MAX_AGE_MINUTES=30
MARKET_CACHE_REFRESH_MS=300000
```

The adapter fails closed if the Actor output has no usable symbols/prices, lacks an upstream timestamp, or is older than the freshness limit. It does not silently replace those failures with demo or local-EOD prices.

## First live validation

1. Configure the backend environment and restart it.
2. Call `POST /market-cache/refresh` once.
3. Open `GET /prices` and confirm `provider` is `APIFY_NSE_KENYA_MARKET_DATA`, `valuationEligible` is `true`, and `generatedAt` is current.
4. If the Actor uses different output field names, retain one redacted dataset item (no token or personal data) so the normalizer can be extended safely.

Run from the backend directory:

```bash
chmod +x scripts/verify-pc030m10c-apify-nse-provider.sh
bash scripts/verify-pc030m10c-apify-nse-provider.sh
```
