# PC-030M10E — Automatic Provider Takeover

The manually verified myStocks snapshot now acts as startup and failure fallback only. It no longer prevents the configured Apify provider from refreshing.

## Expected behavior

- Startup may first restore the latest verified manual snapshot.
- The scheduler immediately attempts the configured automatic provider.
- A successful valuation-eligible Apify response replaces the manual cache.
- If Apify fails, GateCEP retains the verified manual prices instead of clearing the portfolio valuation.
- A synthetic, local, or otherwise non-valuation provider cannot displace the verified fallback.

## Verify

From `~/gatecep/backend`:

```bash
chmod +x scripts/verify-pc030m10e-automatic-provider-takeover.sh
bash scripts/verify-pc030m10e-automatic-provider-takeover.sh
```

Then restart the backend. A successful takeover should log `APIFY_NSE_KENYA_MARKET_DATA`. If Apify is unavailable, the log explicitly states that verified manual quotes were retained.
