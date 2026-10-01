import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(
  new URL(
    "../app/queue-manager.js",
    import.meta.url
  ),
  "utf8"
).replace(/\r\n/g, "\n");

const executeStart =
  src.indexOf(
    "async function executeBrokerReceivedFills("
  );

const runnerStart =
  src.indexOf(
    "async function runConfirmedBrokerReceivedFills(",
    executeStart
  );

const handlerStart =
  src.indexOf(
    "async function fillBrokerReceivedOrders()",
    runnerStart
  );

const markPartialStart =
  src.indexOf(
    "async function markPartial(order)",
    handlerStart
  );

assert.ok(
  executeStart >= 0 &&
  runnerStart > executeStart &&
  handlerStart > runnerStart &&
  markPartialStart > handlerStart,
  "D7D3 fill functions must have coherent boundaries"
);

const executeBlock =
  src.slice(
    executeStart,
    runnerStart
  );

const runnerBlock =
  src.slice(
    runnerStart,
    handlerStart
  );

const handlerBlock =
  src.slice(
    handlerStart,
    markPartialStart
  );

/*
 * Canonical settlement ownership remains centralized.
 */
assert.match(
  executeBlock,
  /preflightCanonicalPracticeExecutionOrders\s*\(/
);

assert.match(
  executeBlock,
  /markExecutionOrderFilled\s*\(/
);

assert.match(
  executeBlock,
  /setExecution\s*\(\s*latest\s*\)/
);

for (const pattern of [
  /savePracticePortfolio\s*\(/,
  /userSetItem\s*\(/,
  /AsyncStorage\.setItem\s*\(/,
  /updateExecutionOrder\s*\(/
]) {
  assert.doesNotMatch(
    executeBlock,
    pattern
  );
}

/*
 * Error handling wraps the shared operation.
 */
assert.match(
  runnerBlock,
  /try\s*\{/
);

assert.match(
  runnerBlock,
  /await executeBrokerReceivedFills\s*\(/
);

assert.match(
  runnerBlock,
  /INSUFFICIENT_PRACTICE_CASH/
);

assert.match(
  runnerBlock,
  /Practice Fill Failed/
);

/*
 * Web confirmation.
 */
assert.match(
  handlerBlock,
  /Platform\.OS\s*===\s*"web"/
);

assert.match(
  handlerBlock,
  /typeof window\s*!==\s*"undefined"/
);

assert.match(
  handlerBlock,
  /window\.confirm\s*\(/
);

assert.match(
  handlerBlock,
  /await runConfirmedBrokerReceivedFills\s*\(/
);

/*
 * Native confirmation remains.
 */
assert.match(
  handlerBlock,
  /Alert\.alert\s*\(/
);

assert.match(
  handlerBlock,
  /text:\s*"Cancel"/
);

assert.match(
  handlerBlock,
  /text:\s*"Fill"/
);

assert.match(
  handlerBlock,
  /void runConfirmedBrokerReceivedFills\s*\(/
);

/*
 * Handler itself must not manufacture settlement state.
 */
assert.doesNotMatch(
  handlerBlock,
  /markExecutionOrderFilled\s*\(/
);

assert.doesNotMatch(
  handlerBlock,
  /status:\s*ORDER_STATUS\.FILLED/
);

console.log(
  "PASS — Expo Web uses an explicit browser confirmation boundary."
);

console.log(
  "PASS — native keeps the existing Alert confirmation UX."
);

console.log(
  "PASS — web and native converge on one canonical fill operation."
);

console.log(
  "PASS — complete Practice batch preflight remains ahead of first settlement."
);

console.log(
  "PASS — Queue Manager still delegates economic settlement to the central fill service."
);

console.log(
  "PASS — settlement failures are surfaced instead of becoming silent async failures."
);

console.log("");
console.log(
  "PC-031B4M7C5D7D3 web fill confirmation contract PASSED."
);
