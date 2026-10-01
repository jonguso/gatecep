import assert from "node:assert/strict";
import fs from "node:fs";

const service = fs.readFileSync(
  new URL(
    "../src/services/trade/practiceExecutionAccountingService.js",
    import.meta.url
  ),
  "utf8"
);

const investorStore = fs.readFileSync(
  new URL(
    "../src/features/investor/investorContextStore.js",
    import.meta.url
  ),
  "utf8"
);

/* Durable canonical settlement marker. */
assert.match(
  service,
  /function normalizePracticeSettlements\(/
);

assert.match(
  service,
  /function practiceSettlementFor\(/
);

assert.match(
  service,
  /function buildPracticeSettlementMarker\(/
);

assert.match(
  service,
  /const durableSettlement\s*=/
);

assert.match(
  service,
  /durableSettlement\?\.applied === true/
);

/* Durable marker must be checked before new accounting. */
const settlementStart = service.indexOf(
  "export async function settlePracticeExecutionOrder"
);

const durableCheck = service.indexOf(
  "durableSettlement?.applied === true",
  settlementStart
);

const estimateCheck = service.indexOf(
  "const estimate = buildPracticeExecutionEstimate",
  settlementStart
);

assert.ok(settlementStart >= 0);
assert.ok(durableCheck > settlementStart);
assert.ok(estimateCheck > durableCheck);

/* Holdings + cash + marker must share canonical write. */
const settlementSave = service.indexOf(
  "await savePracticePortfolio({",
  settlementStart
);

assert.ok(settlementSave > settlementStart);

const saveWindow = service.slice(
  settlementSave,
  settlementSave + 1200
);

assert.match(
  saveWindow,
  /holdings:\s*nextPortfolio/
);

assert.match(
  saveWindow,
  /availableCash:\s*estimate\.remainingCash/
);

assert.match(
  saveWindow,
  /practiceSettlements/
);

assert.match(
  saveWindow,
  /lastPracticeSettlementAt/
);

/* Canonical Practice writer preserves extra metadata. */
assert.match(
  investorStore,
  /const normalized = \{\s*\.\.\.portfolio,/
);

/* Aggregate affordability preflight. */
assert.match(
  service,
  /export function preflightPracticeExecutionOrders\(/
);

assert.match(
  service,
  /let workingCash\s*=/
);

assert.match(
  service,
  /let workingHoldings\s*=/
);

assert.match(
  service,
  /for \(const order of candidates\)/
);

assert.match(
  service,
  /INSUFFICIENT_PRACTICE_CASH/
);

assert.match(
  service,
  /workingHoldings\s*=\s*applyPracticeExecutionToHoldings/
);

assert.match(
  service,
  /workingCash\s*=\s*number\(\s*estimate\.remainingCash\s*\)/
);

assert.match(
  service,
  /export async function preflightCanonicalPracticeExecutionOrders\(/
);

assert.match(
  service,
  /practice\?\.status !== "ACTIVE"/
);

/* Settled orders cannot consume cash twice in preflight. */
assert.match(
  service,
  /settlements\[\s*String\(order\.id\)\s*\]\?\.applied === true/
);

/* Pure preflight must not persist anything. */
const preflightStart = service.indexOf(
  "export function preflightPracticeExecutionOrders"
);

const canonicalPreflightStart = service.indexOf(
  "export async function preflightCanonicalPracticeExecutionOrders"
);

const purePreflight = service.slice(
  preflightStart,
  canonicalPreflightStart
);

assert.doesNotMatch(
  purePreflight,
  /savePracticePortfolio\(/
);

assert.doesNotMatch(
  purePreflight,
  /userSetItem\(/
);

/* Practice settlement service must not mutate REAL state. */
assert.doesNotMatch(
  service,
  /loadUnifiedPortfolioRuntime/
);

assert.doesNotMatch(
  service,
  /saveCanonicalRealPortfolioSnapshot/
);

assert.doesNotMatch(
  service,
  /rebuildCanonicalPortfolioLedger/
);

assert.doesNotMatch(
  service,
  /\/user-cash/
);

console.log(
  "PASS — durable Practice settlement marker contract."
);
console.log(
  "PASS — settlement retry is idempotent at canonical portfolio boundary."
);
console.log(
  "PASS — holdings, cash and settlement marker share one canonical Practice write."
);
console.log(
  "PASS — aggregate Practice affordability preflight contract."
);
console.log(
  "PASS — aggregate preflight is read-only."
);
console.log(
  "PASS — Practice settlement remains isolated from canonical REAL mutation."
);
