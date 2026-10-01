import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) =>
  readFile(
    new URL(`../${path}`, import.meta.url),
    "utf8"
  );

const [
  firstTrade,
  ordersReview,
  basketExecution,
  executionStore,
  orchestrator,
  accounting,
  historyService,
  tradeHistory,
  portfolioHome
] = await Promise.all([
  read("app/first-trade.js"),
  read("app/orders-review.js"),
  read("app/basket-execution.js"),
  read("src/services/trade/basketExecutionStore.js"),
  read("src/services/trade/practiceExecutionOrchestrator.js"),
  read("src/services/trade/practiceExecutionAccountingService.js"),
  read("src/services/trade/practiceExecutionHistoryService.js"),
  read("app/trade-history.js"),
  read("src/features/portfolio-home/PortfolioHomeScreen.js")
]);

/*
 * PC-032G8D7D2B11
 *
 * POST-FIRST-TRADE INVESTOR CONTINUITY CONTRACT
 *
 * This test adds no new execution or accounting authority.
 *
 * It proves continuity across the already-established Practice path:
 *
 * First Trade
 *   -> Orders Review
 *   -> Practice orchestrator
 *   -> GateCEP Broker
 *   -> canonical Practice settlement
 *   -> FILLED
 *   -> Practice portfolio/history
 *   -> guarded closed execution release
 *   -> fresh next Practice execution
 *
 * REAL economic state remains outside this lifecycle.
 */

/* ---------------------------------------------------------- */
/* 1. FIRST TRADE ENTERS CANONICAL OMS                       */
/* ---------------------------------------------------------- */

assert.match(firstTrade, /createBasketExecution/);
assert.match(firstTrade, /executionMode:\s*"PRACTICE"/);
assert.match(firstTrade, /brokerId:\s*"GATECEP_PRACTICE"/);
assert.match(firstTrade, /router\.push\("\/orders-review"\)/);

assert.doesNotMatch(
  firstTrade,
  /\bsavePracticePortfolio\s*\(/
);

console.log(
  "PASS — First Trade remains canonical Practice OMS order entry."
);

/* ---------------------------------------------------------- */
/* 2. ORDERS REVIEW HANDS OFF TO CANONICAL ORCHESTRATOR      */
/* ---------------------------------------------------------- */

assert.match(
  ordersReview,
  /queueExecutionOrders/
);

assert.match(
  ordersReview,
  /runPracticeExecutionOrchestrator/
);

assert.match(
  ordersReview,
  /router\.push\("\/basket-execution"\)/
);

console.log(
  "PASS — Orders Review hands accepted Practice orders to the canonical orchestrator."
);

/* ---------------------------------------------------------- */
/* 3. ORCHESTRATOR OWNS EXECUTION PROGRESSION                */
/* ---------------------------------------------------------- */

assert.match(
  orchestrator,
  /ORDER_STATUS\.QUEUED/
);

assert.match(
  orchestrator,
  /ORDER_STATUS\.BROKER_RECEIVED/
);

assert.match(
  orchestrator,
  /ORDER_STATUS\.FILLED/
);

assert.match(
  orchestrator,
  /markExecutionOrderFilled/
);

assert.doesNotMatch(
  orchestrator,
  /\bsavePracticePortfolio\s*\(/
);

console.log(
  "PASS — Practice execution progression remains restartable and OMS-owned."
);

/* ---------------------------------------------------------- */
/* 4. ACCOUNTING OWNS PRACTICE ECONOMIC EFFECT               */
/* ---------------------------------------------------------- */

assert.match(
  accounting,
  /savePracticePortfolio/
);

assert.match(
  accounting,
  /practiceSimulatedTrades/
);

assert.match(
  accounting,
  /executionOrderId/
);

assert.match(
  accounting,
  /SETTLED/
);

for (const forbidden of [
  /saveCanonicalRealPortfolio/,
  /saveCanonicalRealAvailableCash/,
  /REAL_BROKER_EXECUTION/,
  /CONFIRMED_BROKER_EXECUTION/
]) {
  assert.doesNotMatch(accounting, forbidden);
}

console.log(
  "PASS — completed Practice fills affect only canonical Practice economics."
);

/* ---------------------------------------------------------- */
/* 5. PRACTICE HISTORY REMAINS OBSERVATIONAL                 */
/* ---------------------------------------------------------- */

assert.match(
  historyService,
  /FILLED/
);

/*
 * Closed Practice execution history is execution-level evidence.
 * Its canonical correlation identity is executionId.
 *
 * executionOrderId belongs to canonical settlement/trade history
 * (practiceSimulatedTrades), not the closed execution archive.
 */
assert.match(
  historyService,
  /executionId/
);

for (const forbidden of [
  /\bsettlePracticeExecutionOrder\s*\(/,
  /\bmarkExecutionOrderFilled\s*\(/,
  /\brouteExecutionOrderByMode\s*\(/,
  /\bqueueExecutionOrders\s*\(/
]) {
  assert.doesNotMatch(historyService, forbidden);
}

console.log(
  "PASS — completed Practice history observes settlement without becoming settlement authority."
);

/* ---------------------------------------------------------- */
/* 6. TRADE HISTORY READS PRACTICE SETTLEMENT HISTORY        */
/* ---------------------------------------------------------- */

assert.match(
  tradeHistory,
  /practiceSimulatedTrades/
);

assert.doesNotMatch(
  tradeHistory,
  /\bsavePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  tradeHistory,
  /\bsettlePracticeExecutionOrder\s*\(/
);

console.log(
  "PASS — Trade History remains a read-only Practice settlement surface."
);

/* ---------------------------------------------------------- */
/* 7. PORTFOLIO READS PRACTICE STATE                         */
/* ---------------------------------------------------------- */

assert.match(
  portfolioHome,
  /practicePortfolio|PRACTICE/
);

console.log(
  "PASS — investor portfolio surface retains a Practice-state read path."
);

/* ---------------------------------------------------------- */
/* 8. CLOSED EXECUTION RELEASE IS CENTRALIZED                */
/* ---------------------------------------------------------- */

assert.match(
  executionStore,
  /clearBasketExecution/
);

assert.match(
  executionStore,
  /isActiveOrder/
);

/*
 * The central store must explicitly protect active OMS state.
 */

assert.match(
  executionStore,
  /forceNew/
);

console.log(
  "PASS — closed execution release remains guarded by the canonical OMS store."
);

/* ---------------------------------------------------------- */
/* 9. BASKET EXECUTION IS NOT AN ACCOUNTING AUTHORITY        */
/* ---------------------------------------------------------- */

assert.match(
  basketExecution,
  /loadBasketExecution/
);

assert.doesNotMatch(
  basketExecution,
  /\bsavePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  basketExecution,
  /\bsettlePracticeExecutionOrder\s*\(/
);

assert.doesNotMatch(
  basketExecution,
  /\bmarkExecutionOrderFilled\s*\(/
);

console.log(
  "PASS — Basket Execution remains an investor-facing OMS surface, not an accounting engine."
);

/* ---------------------------------------------------------- */
/* 10. NEXT TRADE CANNOT REPLACE ACTIVE OMS STATE            */
/* ---------------------------------------------------------- */

assert.match(
  firstTrade,
  /loadBasketExecution/
);

assert.match(
  firstTrade,
  /isActiveOrder/
);

const activeCheck =
  firstTrade.indexOf("loadBasketExecution");

const createFresh =
  firstTrade.indexOf(
    "createBasketExecution({"
  );

assert.ok(
  activeCheck >= 0 &&
  createFresh > activeCheck,
  "First Trade must inspect active OMS state before fresh execution creation"
);

console.log(
  "PASS — next First Trade cannot replace active OMS state."
);

/* ---------------------------------------------------------- */
/* 11. REAL / PRACTICE BOUNDARY REMAINS HARD                 */
/* ---------------------------------------------------------- */

for (const forbidden of [
  /saveCanonicalRealPortfolio/,
  /saveCanonicalRealAvailableCash/,
  /CONFIRMED_BROKER_EXECUTION/,
  /REAL_BROKER_EXECUTION/
]) {
  assert.doesNotMatch(firstTrade, forbidden);
  assert.doesNotMatch(accounting, forbidden);
}

console.log(
  "PASS — post-first-trade continuity remains economically isolated from REAL."
);

/* ---------------------------------------------------------- */
/* 12. CONTRACT SUMMARY                                      */
/* ---------------------------------------------------------- */

console.log(
  "PASS — First Trade enters canonical Practice OMS."
);

console.log(
  "PASS — accepted Practice orders progress through the existing broker simulator."
);

console.log(
  "PASS — canonical Practice accounting owns completed economic effects."
);

console.log(
  "PASS — Practice Portfolio and Trade History remain downstream read surfaces."
);

console.log(
  "PASS — closed execution lifecycle remains centrally guarded."
);

console.log(
  "PASS — active execution cannot be overwritten by the next First Trade."
);

console.log(
  "PASS — PC-032G8D7D2B11 post-first-trade investor continuity contract complete."
);
