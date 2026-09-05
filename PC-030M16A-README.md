# PC-030M16A — Contained Market Results

This update keeps the active securities list inside a responsive fixed-height panel so Indices and Watchlist remain accessible beneath it on every Market tab.

## Included behavior

- Equities, Gainers, Losers, Volume and Turnover share the same bounded results area.
- The results area scales from 310px on smaller screens to 430px on large screens.
- Securities scroll inside that panel with a visible scrollbar.
- Changing the tab or search resets the internal list to its first row.
- The search box, result count and tab controls remain outside the internal scroll.
- Indices and Watchlist remain available below the panel across all ranking tabs.
- Security and Watchlist row taps continue to open Security Education.

## Install and verify

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m16a-contained-market-results.zip

cd mobile
bash scripts/verify-pc030m13e-distinct-market-rankings.sh
bash scripts/verify-pc030m16a-contained-market-results.sh

npx expo start --clear --lan
```
