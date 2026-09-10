# PC-030M20AQ1 — Trading Route Hotfix

Corrects the M20AQ apply-script failure on the real route `mobile/app/(tabs)/trading.js`.

The original M20AQ service/test passed, but its UI patch aborted because it depended on an exact `const cash = Number(data?.cash || 0);` source anchor. AQ1 removes that fragile dependency.

AQ1:
- targets `mobile/app/(tabs)/trading.js` explicitly;
- injects the Decision Lab as a self-contained component before the existing `ActiveUserBanner`;
- reads portfolio/cash from several existing data shapes without changing them;
- retains Account / Orders / Depth / Activity as Broker Evidence;
- connects Goal & Recovery to `/wealth-journey`;
- connects preferred scenarios to `/basket-execution?mode=BROKER_PLAN`;
- makes `/trade` honor the requested BUY/SELL side from Decision Lab;
- remains analytical/read-only and adds no REAL/Practice mutation.

Run from `~/gatecep`:

```bash
unzip -o ~/Downloads/gatecep-pc030m20aq1-trading-route-hotfix.zip
chmod +x scripts/apply-pc030m20aq1-trading-route-hotfix.sh
chmod +x scripts/verify-pc030m20aq1-trading-route-hotfix.sh
bash scripts/apply-pc030m20aq1-trading-route-hotfix.sh
bash scripts/verify-pc030m20aq1-trading-route-hotfix.sh
```
