# PC-030M20AM — Investor-Facing Canonical Symbol Cleanup

Purpose: make `EQT` the single internal/investor-facing GateCEP symbol for Equity Group Holdings while preserving `EQTY`/`EQTYO0000` only as external/provider/CDSC aliases and regression fixtures.

This increment intentionally does **not** globally replace `EQTY`.

## Internal references changed to `EQT`
- mobile/app/(tabs)/markets.js
- mobile/app/first-trade.js
- mobile/app/watchlist.js
- mobile/src/features/broker-sync/brokerSyncService.js
- mobile/src/features/fundamentals/seeds/nseFundamentalSeed.js
- mobile/src/features/practice/PracticePortfolio.jsx
- mobile/src/services/dashboard/dashboardHomeData.js
- mobile/src/services/trade/marketDepthData.js
- mobile/src/utils/demoMarketEngine.js
- backend/src/modules/dividends/dividend.service.js

## External/provider aliases intentionally preserved
- mobile/src/features/trading/securityIdentityService.js
- mobile/src/services/markets/canonicalNseQuoteService.js
- backend/src/data/nseSecurityMaster.js
- backend/src/modules/market-cache/marketCache.service.js
- backend/src/services/marketData/MyStocksCsvNormalizer.js
- provider/raw-data fixtures and regression tests

## Install
From `~/gatecep`:

```bash
unzip -o ~/Downloads/gatecep-pc030m20am-investor-facing-canonical-symbol.zip
chmod +x scripts/apply-pc030m20am-investor-facing-canonical-symbol.sh
chmod +x scripts/verify-pc030m20am-investor-facing-canonical-symbol.sh
bash scripts/apply-pc030m20am-investor-facing-canonical-symbol.sh
bash scripts/verify-pc030m20am-investor-facing-canonical-symbol.sh
```

The apply script is targeted and idempotent. It preserves `EQTY` in alias/provider boundaries and fails if a required target cannot be found in either its pre-change or already-canonical form.
