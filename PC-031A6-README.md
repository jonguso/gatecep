# PC-031A6 — Per-Order Multi-Broker Execution Eligibility

Purpose
-------
Restore the intended REAL order-review architecture without adding a second broker-management,
cash, holdings, or routing subsystem.

This patch:
- keeps Practice on GateCEP Broker with no broker chooser;
- loads only connected REAL broker accounts for REAL Orders Review;
- evaluates each REAL order against broker-specific cash / holdings / verified fee evidence;
- supports different broker assignments for different orders in the same basket;
- reserves BUY cash and SELL quantity across already-assigned review orders so one broker is not
  overcommitted by multiple orders;
- persists `brokerAccountId`, `brokerId`, `brokerName`, and advisory fee metadata on the order;
- blocks REAL queueing until a specific eligible broker account is assigned;
- preserves the downstream `routeExecutionOrderByMode(order.id)` boundary;
- does not fabricate cash, holdings, fees, broker receipts, fills, or REAL portfolio mutation.

Files
-----
New:
- `mobile/src/services/trade/brokerExecutionEligibilityService.js`

Modified:
- `mobile/app/orders-review.js`
- `mobile/src/services/trade/basketExecutionStore.js`
- `mobile/app/trade-basket.js`

Run from repository root:

```bash
unzip -o ~/Downloads/gatecep-pc031a6-per-order-multi-broker-eligibility.zip
chmod +x scripts/apply-pc031a6-per-order-multi-broker-eligibility.sh
chmod +x scripts/verify-pc031a6-per-order-multi-broker-eligibility.sh

bash scripts/apply-pc031a6-per-order-multi-broker-eligibility.sh
bash scripts/verify-pc031a6-per-order-multi-broker-eligibility.sh
```

Then compile:

```bash
cd mobile
npx expo export --platform web --output-dir "$TEMP/gatecep-pc031a6-build"
cd ..
```

Do not push yet.
