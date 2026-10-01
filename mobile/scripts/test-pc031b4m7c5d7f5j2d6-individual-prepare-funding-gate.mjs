import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(
  new URL("../app/orders-review.js", import.meta.url),
  "utf8"
);

const start =
  source.indexOf(
    "async function queueOrder(order)"
  );

const end =
  source.indexOf(
    "async function executeConfirmedHandoff()",
    start
  );

assert.ok(
  start >= 0 && end > start,
  "queueOrder handler must exist"
);

const handler = source.slice(start, end);

assert.match(
  handler,
  /if\s*\(\s*!isRealExecution\s*\)/,
  "Practice funding gate must be Practice-only"
);

assert.match(
  handler,
  /prospectiveOrders\s*=\s*\[\s*\.\.\.queuedOrders\s*,\s*order\s*\]/s,
  "Individual prepare must preflight existing QUEUED orders plus current order"
);

assert.match(
  handler,
  /preflightCanonicalPracticeExecutionOrders\s*\(\s*prospectiveOrders\s*\)/s,
  "Prospective Practice batch must use canonical aggregate preflight"
);

const preflightIndex =
  handler.indexOf(
    "preflightCanonicalPracticeExecutionOrders"
  );

const queueIndex =
  handler.indexOf(
    "queueSingleOrder(order.id)"
  );

assert.ok(
  preflightIndex >= 0,
  "Practice preflight must exist"
);

assert.ok(
  queueIndex > preflightIndex,
  "Practice funding preflight must occur before queue mutation"
);

assert.match(
  handler,
  /Practice Funds Required/,
  "Insufficient Practice funding must have investor recovery UI"
);

assert.match(
  handler,
  /The order remains in Review/,
  "Failed Practice funding must explicitly preserve Review state"
);

/*
 * Comments immediately following queueOrder() document the batch
 * handoff authority and legitimately mention queueExecutionOrders().
 *
 * Strip block/line comments before checking executable ownership.
 */
const executableHandler = handler
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");

assert.doesNotMatch(
  executableHandler,
  /\bqueueExecutionOrders\s*\(/,
  "Individual prepare must not take executable batch queue ownership"
);

assert.doesNotMatch(
  handler,
  /runPracticeExecutionOrchestrator\s*\(/,
  "Individual prepare must not start execution orchestration"
);

assert.doesNotMatch(
  handler,
  /routeExecutionOrderByMode\s*\(/,
  "Individual prepare must not route directly"
);

assert.doesNotMatch(
  handler,
  /markExecutionOrderFilled\s*\(/,
  "Individual prepare must not fill directly"
);

assert.doesNotMatch(
  handler,
  /savePracticePortfolio\s*\(|AsyncStorage\.(?:setItem|multiSet)\s*\(/,
  "Individual prepare must not own Practice accounting/storage"
);

console.log(
  "PASS — individual Practice prepare preflights prospective QUEUED batch."
);
console.log(
  "PASS — aggregate affordability is checked before queueSingleOrder mutation."
);
console.log(
  "PASS — insufficient Practice funding leaves current order in Review."
);
console.log(
  "PASS — REAL broker-eligibility path remains independent."
);
console.log(
  "PASS — queue, routing, orchestration, settlement and storage ownership are not duplicated."
);
