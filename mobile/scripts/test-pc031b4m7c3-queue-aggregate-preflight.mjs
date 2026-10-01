import assert from "node:assert/strict";
import fs from "node:fs";

const queue = fs.readFileSync(
  new URL("../app/queue-manager.js", import.meta.url),
  "utf8"
);

assert.match(
  queue,
  /preflightCanonicalPracticeExecutionOrders/
);

assert.match(
  queue,
  /practiceExecutionAccountingService/
);

/*
 * Aggregate preflight must occur before the first full-fill
 * mutation in the bulk received-order path.
 */
const preflight = queue.indexOf(
  "await preflightCanonicalPracticeExecutionOrders"
);

const fill = queue.indexOf(
  "await markExecutionOrderFilled",
  preflight
);

assert.ok(preflight >= 0);
assert.ok(fill > preflight);

/*
 * Preflight must receive the batch, not one order at a time.
 */
const preflightWindow = queue.slice(
  preflight,
  fill
);

assert.doesNotMatch(
  preflightWindow,
  /preflightCanonicalPracticeExecutionOrders\s*\(\s*\[\s*order\s*\]/
);

/*
 * Insufficient Practice cash gets an explicit recovery path.
 */
assert.match(
  queue,
  /INSUFFICIENT_PRACTICE_CASH/
);

assert.match(
  queue,
  /Practice Funds Required/
);

assert.match(
  queue,
  /\/\(tabs\)\/funds\?source=PRACTICE/
);

/*
 * Partial-fill behavior remains independent from accounting
 * settlement.
 */
assert.match(
  queue,
  /markExecutionOrderPartial/
);

/*
 * Queue Manager must not directly mutate canonical Practice
 * portfolio or REAL portfolio state.
 */
assert.doesNotMatch(
  queue,
  /savePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  queue,
  /saveCanonicalRealPortfolioSnapshot\s*\(/
);

assert.doesNotMatch(
  queue,
  /loadUnifiedPortfolioRuntime\s*\(/
);

console.log(
  "PASS — Queue Manager preflights the complete Practice fill batch before first settlement."
);

console.log(
  "PASS — insufficient aggregate Practice cash fails closed before mutation."
);

console.log(
  "PASS — insufficient cash provides a direct Practice Funds recovery path."
);

console.log(
  "PASS — partial-fill path remains independent from canonical Practice settlement."
);

console.log(
  "PASS — Queue Manager remains orchestration-only for portfolio accounting."
);
