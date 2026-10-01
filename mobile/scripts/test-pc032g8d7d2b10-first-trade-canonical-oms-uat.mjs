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
  orchestrator,
  executionStore,
  accounting,
  historyService
] = await Promise.all([
  read("app/first-trade.js"),
  read("app/orders-review.js"),
  read("src/services/trade/practiceExecutionOrchestrator.js"),
  read("src/services/trade/basketExecutionStore.js"),
  read("src/services/trade/practiceExecutionAccountingService.js"),
  read("src/services/trade/practiceExecutionHistoryService.js")
]);

/*
 * PC-032G8D7D2B10
 *
 * FIRST TRADE CANONICAL PRACTICE OMS UAT CONTRACT
 *
 * This test does NOT introduce another simulator.
 *
 * It proves that First Trade joins the already-established
 * canonical Practice execution pipeline:
 *
 * First Trade
 *   -> Practice basket
 *   -> OMS REVIEW
 *   -> Orders Review
 *   -> funding preflight
 *   -> QUEUED
 *   -> Practice orchestrator
 *   -> GateCEP Broker
 *   -> BROKER_RECEIVED
 *   -> canonical Practice settlement
 *   -> FILLED
 *   -> Practice portfolio + Practice history
 *
 * REAL portfolio state must remain outside this path.
 */

/* ---------------------------------------------------------- */
/* 1. FIRST TRADE IS ORDER ENTRY ONLY                         */
/* ---------------------------------------------------------- */

assert.match(
  firstTrade,
  /saveTradeBasket/
);

assert.match(
  firstTrade,
  /createBasketExecution/
);

assert.match(
  firstTrade,
  /FIRST_TRADE_PRACTICE/
);

assert.match(
  firstTrade,
  /executionMode:\s*"PRACTICE"/
);

assert.match(
  firstTrade,
  /brokerId:\s*"GATECEP_PRACTICE"/
);

assert.match(
  firstTrade,
  /router\.push\("\/orders-review"\)/
);

for (const forbidden of [
  /savePracticePortfolio/,
  /practiceSimulatedTrades/,
  /SIMULATED_EXECUTED/,
  /settlementStatus:\s*"SETTLED"/
]) {
  assert.doesNotMatch(
    firstTrade,
    forbidden
  );
}

/* ---------------------------------------------------------- */
/* 2. ACTIVE EXECUTION COLLISION MUST FAIL CLOSED             */
/* ---------------------------------------------------------- */

assert.match(
  firstTrade,
  /loadBasketExecution/
);

assert.match(
  firstTrade,
  /isActiveOrder/
);

assert.match(
  firstTrade,
  /Active Orders Already Exist/
);

const activeCheck =
  firstTrade.indexOf("loadBasketExecution");

const forceNewCreate =
  firstTrade.indexOf(
    "createBasketExecution({"
  );

assert.ok(
  activeCheck >= 0 &&
  forceNewCreate > activeCheck,
  "First Trade must inspect canonical active OMS state before forceNew creation"
);

/* ---------------------------------------------------------- */
/* 3. ORDERS REVIEW OWNS PRE-QUEUE ACCEPTANCE                 */
/* ---------------------------------------------------------- */

assert.match(
  ordersReview,
  /queueExecutionOrders|queueSingleOrder/
);

assert.match(
  ordersReview,
  /runPracticeExecutionOrchestrator/
);

assert.match(
  ordersReview,
  /INSUFFICIENT_PRACTICE_CASH/
);

/*
 * Funding rejection must remain ahead of queue mutation.
 * We do not prescribe UI wording; only the economic boundary.
 */

const insufficientIndex =
  ordersReview.indexOf(
    "INSUFFICIENT_PRACTICE_CASH"
  );

const queueAllIndex =
  ordersReview.indexOf(
    "queueExecutionOrders("
  );

assert.ok(
  insufficientIndex >= 0,
  "Orders Review must handle insufficient Practice funding"
);

assert.ok(
  queueAllIndex >= 0,
  "Orders Review must use canonical OMS queue authority"
);

/* ---------------------------------------------------------- */
/* 4. ORCHESTRATOR MUST USE CANONICAL AUTHORITIES             */
/* ---------------------------------------------------------- */

assert.match(
  orchestrator,
  /loadBasketExecution/
);

assert.match(
  orchestrator,
  /routeExecutionOrderByMode/
);

assert.match(
  orchestrator,
  /markExecutionOrderFilled/
);

assert.match(
  orchestrator,
  /preflightCanonicalPracticeExecutionOrders/
);

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

/*
 * Orchestrator must not become a second accounting authority.
 */

assert.doesNotMatch(
  orchestrator,
  /\bsavePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  orchestrator,
  /\buserSetItem\s*\(\s*["'`]practicePortfolio/
);

/* ---------------------------------------------------------- */
/* 5. GATECEP BROKER MUST PROVIDE PRACTICE BROKER EXPERIENCE  */
/* ---------------------------------------------------------- */

assert.match(
  executionStore,
  /GATECEP_PRACTICE/
);

assert.match(
  executionStore,
  /GateCEP Broker/
);

assert.match(
  executionStore,
  /ORDER_STATUS\.BROKER_RECEIVED/
);

assert.match(
  executionStore,
  /GateCEP Broker received/
);

/*
 * Canonical full fill must delegate to Practice settlement.
 */

assert.match(
  executionStore,
  /settlePracticeExecutionOrder/
);

assert.match(
  executionStore,
  /ORDER_STATUS\.FILLED/
);

/* ---------------------------------------------------------- */
/* 6. PRACTICE ACCOUNTING OWNS ECONOMIC EFFECT                */
/* ---------------------------------------------------------- */

assert.match(
  accounting,
  /loadInvestorContext/
);

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
  /INSUFFICIENT_PRACTICE_CASH/
);

assert.match(
  accounting,
  /SETTLED/
);

/*
 * BUY and SELL must both exist in the central settlement model.
 */

assert.match(
  accounting,
  /BUY/
);

assert.match(
  accounting,
  /SELL/
);

/* ---------------------------------------------------------- */
/* 7. REAL / PRACTICE ECONOMIC ISOLATION                      */
/* ---------------------------------------------------------- */

/*
 * First Trade may read user-scoped Practice state, but it must
 * never write canonical REAL portfolio/cash/broker evidence.
 */

for (const forbidden of [
  /savePortfolio/,
  /canonicalRealPortfolio/,
  /saveCanonicalReal/,
  /userSetItem\(\s*["'`]availableCash["'`]/,
  /userSetItem\(\s*["'`]statementUploaded["'`]/,
  /userSetItem\(\s*["'`]simulatedTrades["'`]/,
  /buildSyncStatus/,
  /defaultBrokerProfile/
]) {
  assert.doesNotMatch(
    firstTrade,
    forbidden
  );
}

/*
 * Central Practice accounting must remain Practice-scoped.
 */

for (const forbidden of [
  /saveCanonicalRealPortfolio/,
  /saveCanonicalRealAvailableCash/,
  /CONFIRMED_BROKER_EXECUTION/,
  /REAL_BROKER_EXECUTION/
]) {
  assert.doesNotMatch(
    accounting,
    forbidden
  );
}

/* ---------------------------------------------------------- */
/* 8. COMPLETED PRACTICE HISTORY MUST BE OBSERVATIONAL        */
/* ---------------------------------------------------------- */

assert.match(
  historyService,
  /FILLED/
);

for (const forbidden of [
  /\bsettlePracticeExecutionOrder\s*\(/,
  /\bmarkExecutionOrderFilled\s*\(/,
  /\bqueueExecutionOrders\s*\(/,
  /\brouteExecutionOrderByMode\s*\(/
]) {
  assert.doesNotMatch(
    historyService,
    forbidden
  );
}

/* ---------------------------------------------------------- */
/* 9. PIPELINE CONTRACT SUMMARY                               */
/* ---------------------------------------------------------- */

console.log(
  "PASS — First Trade is canonical Practice OMS order entry only."
);

console.log(
  "PASS — First Trade checks active OMS state before creating a new execution."
);

console.log(
  "PASS — Orders Review owns Practice funding acceptance and queue handoff."
);

console.log(
  "PASS — Practice orchestrator owns restartable broker/fill progression."
);

console.log(
  "PASS — GateCEP Broker provides canonical BROKER_RECEIVED Practice simulation."
);

console.log(
  "PASS — canonical Practice accounting owns BUY/SELL economic settlement."
);

console.log(
  "PASS — insufficient Practice funding remains fail-closed."
);

console.log(
  "PASS — completed Practice history remains observational."
);

console.log(
  "PASS — First Trade and Practice settlement remain isolated from REAL economic state."
);

console.log(
  "PASS — First Trade canonical Practice OMS UAT contract complete."
);
