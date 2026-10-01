import assert from "node:assert/strict";
import fs from "node:fs";

const trade = fs.readFileSync(
  new URL("../app/trade.js", import.meta.url),
  "utf8"
);

/*
 * Canonical aggregate preflight is available to the
 * whole-basket Practice execution path.
 */
assert.match(
  trade,
  /preflightCanonicalPracticeExecutionOrders/
);

assert.match(
  trade,
  /practiceExecutionAccountingService/
);

/*
 * Standalone persistence still exists.
 */
assert.match(
  trade,
  /async function persistTrade/
);

assert.match(
  trade,
  /await savePracticePortfolio\s*\(/
);

/*
 * Single OMS-backed trade chooses central settlement instead
 * of persistTrade + markExecutionOrderFilled sequentially.
 */
const confirmStart = trade.indexOf(
  "async function confirmTrade"
);

const markHelperStart = trade.indexOf(
  "function findCurrentPracticeExecutionOrder",
  confirmStart
);

assert.ok(confirmStart >= 0);
assert.ok(markHelperStart > confirmStart);

const confirm = trade.slice(
  confirmStart,
  markHelperStart
);

assert.match(
  confirm,
  /const executionOrder\s*=\s*findCurrentPracticeExecutionOrder\(\)/
);

assert.match(
  confirm,
  /if \(executionOrder\)/
);

assert.match(
  confirm,
  /await markBasketOrderFilled\s*\(\s*trade,\s*executionOrder\s*\)/
);

/*
 * New Practice orders must not bypass canonical OMS through
 * direct persistTrade().
 *
 * The investor order is persisted to the basket, a fresh
 * Practice OMS execution is created, and Orders Review owns
 * the next acceptance / broker-simulation step.
 */
assert.doesNotMatch(
  confirm,
  /await\s+persistTrade\s*\(/
);

assert.match(
  confirm,
  /await saveTradeBasket\s*\(/
);

assert.match(
  confirm,
  /await createBasketExecution\s*\(\s*\{[\s\S]*?forceNew:\s*true[\s\S]*?\}\s*\)/
);

assert.match(
  confirm,
  /router\.push\s*\(\s*["']\/orders-review["']\s*\)/
);

/*
 * OMS-backed branch must not contain persistTrade before the
 * central fill call.
 */
const omsBranchStart = confirm.indexOf(
  "if (executionOrder)"
);

const omsFill = confirm.indexOf(
  "await markBasketOrderFilled",
  omsBranchStart
);

const omsBranchEnd = confirm.indexOf(
  "await saveTradeBasket",
  omsFill
);

assert.ok(omsBranchStart >= 0);
assert.ok(omsFill > omsBranchStart);
assert.ok(omsBranchEnd > omsFill);

const omsBranch = confirm.slice(
  omsBranchStart,
  omsBranchEnd
);

/*
 * Strip comments before checking executable calls.
 * The source comment intentionally documents that
 * persistTrade() must NOT be called in this branch.
 */
const executableOmsBranch = omsBranch
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

assert.doesNotMatch(
  executableOmsBranch,
  /(?:await\s+)?persistTrade\s*\(/
);

/*
 * Whole-basket runner must preflight before first canonical
 * full fill.
 */
const basketStart = trade.indexOf(
  "async function runBasketExecution"
);

const basketEnd = trade.indexOf(
  "const basketRemaining",
  basketStart
);

assert.ok(basketStart >= 0);
assert.ok(basketEnd > basketStart);

const basket = trade.slice(
  basketStart,
  basketEnd
);

const preflight = basket.indexOf(
  "await preflightCanonicalPracticeExecutionOrders"
);

const fill = basket.indexOf(
  "await markExecutionOrderFilled"
);

assert.ok(preflight >= 0);
assert.ok(fill > preflight);

/*
 * Legacy basket accounting authority is gone.
 */
assert.doesNotMatch(
  basket,
  /savePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  basket,
  /userSetItem\s*\(\s*"practiceSimulatedTrades"/
);

assert.doesNotMatch(
  basket,
  /saveBasketExecution\s*\(/
);

assert.doesNotMatch(
  basket,
  /status:\s*"FILLED"/
);

assert.doesNotMatch(
  basket,
  /workingPortfolio/
);

assert.doesNotMatch(
  basket,
  /workingCash/
);

/*
 * REAL boundary remains ahead of Practice basket settlement.
 */
const realGuard = basket.indexOf(
  "isRealExecution(activeExecution)"
);

assert.ok(realGuard >= 0);
assert.ok(preflight > realGuard);

/*
 * Funding recovery remains explicit.
 */
assert.match(
  basket,
  /INSUFFICIENT_PRACTICE_CASH/
);

assert.match(
  basket,
  /\/\(tabs\)\/funds\?source=PRACTICE/
);

console.log(
  "PASS — new Practice trades enter canonical OMS instead of direct persistence."
);

console.log(
  "PASS — OMS-backed single Practice fills use the central settlement authority without pre-persistence."
);

console.log(
  "PASS — whole-basket Practice execution preflights the complete batch before settlement."
);

console.log(
  "PASS — whole-basket legacy portfolio/history/FILLED mutation authority is removed."
);

console.log(
  "PASS — REAL execution rejection remains ahead of Practice settlement."
);
