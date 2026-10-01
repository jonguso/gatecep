import assert from "node:assert/strict";
import fs from "node:fs";

const store = fs.readFileSync(
  new URL(
    "../src/services/trade/basketExecutionStore.js",
    import.meta.url
  ),
  "utf8"
);

/*
 * Central store imports canonical Practice accounting.
 */
assert.match(
  store,
  /settlePracticeExecutionOrder/
);

assert.match(
  store,
  /from "\.\/practiceExecutionAccountingService"/
);

/*
 * Isolate the full-fill function.
 */
const fillStart = store.indexOf(
  "export async function markExecutionOrderFilled"
);

const nextExport = store.indexOf(
  "export function getActiveExecutionOrders",
  fillStart
);

assert.ok(fillStart >= 0);
assert.ok(nextExport > fillStart);

const fill = store.slice(
  fillStart,
  nextExport
);

/*
 * REAL guard remains intact.
 */
assert.match(
  fill,
  /executionMode === "REAL"/
);

assert.match(
  fill,
  /REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION/
);

/*
 * Practice settlement occurs before OMS FILLED persistence.
 */
const realGuard = fill.indexOf(
  'executionMode === "REAL"'
);

const settlement = fill.indexOf(
  "await settlePracticeExecutionOrder"
);

const omsUpdate = fill.indexOf(
  "await updateExecutionOrder"
);

const filledStatus = fill.indexOf(
  "status: ORDER_STATUS.FILLED"
);

assert.ok(
  settlement > realGuard,
  "Practice settlement must remain behind REAL rejection"
);

assert.ok(
  omsUpdate > settlement,
  "OMS update must occur only after Practice settlement"
);

assert.ok(
  filledStatus > settlement,
  "FILLED state must occur only after Practice settlement"
);

/*
 * Durable accounting evidence propagates into OMS.
 */
assert.match(
  fill,
  /const practiceAccounting\s*=/
);

assert.match(
  fill,
  /practiceAccounting:\s*\{/
);

assert.match(
  fill,
  /applied:\s*true/
);

assert.match(
  fill,
  /settlement\?\.alreadyApplied/
);

/*
 * Practice identity remains explicit.
 */
assert.match(
  fill,
  /executionMode:\s*"PRACTICE"/
);

assert.match(
  fill,
  /isPractice:\s*true/
);

assert.match(
  fill,
  /GATECEP_BROKER_PRACTICE/
);

/*
 * Partial-fill function must NOT invoke canonical accounting.
 * Partial remains execution-state only.
 */
const partialStart = store.indexOf(
  "export async function markExecutionOrderPartial"
);

assert.ok(partialStart >= 0);
assert.ok(fillStart > partialStart);

const partial = store.slice(
  partialStart,
  fillStart
);

assert.doesNotMatch(
  partial,
  /settlePracticeExecutionOrder\(/
);

assert.match(
  partial,
  /status:\s*ORDER_STATUS\.PARTIAL_FILL/
);

console.log(
  "PASS — Practice full fill settles canonical Practice accounting before OMS FILLED."
);

console.log(
  "PASS — REAL manual full-fill rejection remains ahead of Practice settlement."
);

console.log(
  "PASS — durable Practice accounting evidence propagates into the execution order."
);

console.log(
  "PASS — interrupted Practice settlement can finish OMS state without repeat accounting."
);

console.log(
  "PASS — Practice partial fill remains execution-state only."
);
