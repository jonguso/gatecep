# PC-030M10H — Dynamic Market Universe

The Markets experience now renders the complete verified `/prices` response instead of the former ten-row sample.

## Behavior

- Equities displays every verified security returned by the backend.
- Gainers, Losers, Volume, Turnover, and Summary derive from the same response.
- Search operates across the complete symbol and company-name set.
- The Equities heading shows the current result count.
- Markets displays provider and last-update evidence.
- Watchlist selection uses the same dynamic market universe.
- If `/prices` is unavailable, the UI fails closed instead of displaying hard-coded prices.

## Install and verify

```bash
cd ~/gatecep/mobile
unzip -o ~/Downloads/gatecep-pc030m10h-dynamic-market-universe.zip

chmod +x scripts/verify-pc030m10h-dynamic-market-universe.sh
bash scripts/verify-pc030m10h-dynamic-market-universe.sh

npx expo start --clear --lan
```
