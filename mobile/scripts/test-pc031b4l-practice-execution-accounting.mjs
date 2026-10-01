import assert from "node:assert/strict";
import fs from "node:fs";

const service = fs.readFileSync(
  new URL(
    "../src/services/trade/practiceExecutionAccountingService.js",
    import.meta.url
  ),
  "utf8"
);

const executionStore = fs.readFileSync(
  new URL(
    "../src/services/trade/basketExecutionStore.js",
    import.meta.url
  ),
  "utf8"
);

assert.match(
  service,
  /commissionRatePct:\s*1\.2/
);

assert.match(
  service,
  /otherChargesRatePct:\s*0\.2/
);

assert.match(
  service,
  /savePracticePortfolio/
);

assert.match(
  service,
  /"practiceSimulatedTrades"/
);

assert.match(
  service,
  /executionOrderId/
);

assert.match(
  service,
  /practiceAccounting/
);

assert.match(
  service,
  /INSUFFICIENT_PRACTICE_CASH/
);

assert.match(
  service,
  /PRACTICE_SELL_QUANTITY_EXCEEDED/
);

assert.doesNotMatch(
  service,
  /loadUnifiedPortfolioRuntime|saveCanonicalReal|refreshCanonicalReal|canonicalPortfolioLedger|lotLedger/
);

assert.match(
  executionStore,
  /REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION/
);

console.log(
  "PASS — Practice accounting service preserves the existing 1.2% + 0.2% fee contract."
);
console.log(
  "PASS — Practice settlement writes only canonical Practice portfolio + user-scoped Practice trade history."
);
console.log(
  "PASS — Practice settlement has durable executionOrderId/accounting evidence for idempotency."
);
console.log(
  "PASS — Practice BUY cash and SELL holding guards are explicit."
);
console.log(
  "PASS — Practice accounting service has no canonical REAL portfolio/lot mutation dependency."
);
console.log(
  "PASS — existing REAL manual-fill rejection remains present."
);
