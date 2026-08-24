# PC-030M13A — Interactive Market Depth

- Markets opens on **Equities** instead of Summary.
- Tapping any verified security in a market list or Watchlist opens a focused, Expo-safe sheet.
- The sheet shows the verified price, change, volume, turnover, best bid/ask, source, and quote time.
- Genuine provider `bids` and `asks` render as an order book with Quantity, Price, Splits, and Time.
- `LOCAL_VERIFIED_EOD` does not fabricate Level 2 orders. When the feed has no genuine depth, the sheet states that verified Level 2 depth is unavailable.
- The feature is read-only and cannot place an order.

## Verify

```bash
chmod +x scripts/verify-pc030m13a-interactive-market-depth.sh
bash scripts/verify-pc030m13a-interactive-market-depth.sh
```
