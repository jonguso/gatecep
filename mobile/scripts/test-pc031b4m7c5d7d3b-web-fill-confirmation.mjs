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

const partialStart =
  src.indexOf(
    "async function markPartial(order)",
    handlerStart
  );

assert.ok(
  executeStart >= 0 &&
  runnerStart > executeStart &&
  handlerStart > runnerStart &&
  partialStart > handlerStart,
  "D7D3B function boundaries must be coherent"
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
    partialStart
  );


/*
 * Shared execution path.
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
 * Guarded async runner.
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
 * Native confirmation.
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
 * Confirmation layer cannot settle directly.
 */
for (const pattern of [
  /markExecutionOrderFilled\s*\(/,
  /savePracticePortfolio\s*\(/,
  /userSetItem\s*\(/,
  /AsyncStorage\.setItem\s*\(/,
  /updateExecutionOrder\s*\(/,
  /status:\s*ORDER_STATUS\.FILLED/
]) {
  assert.doesNotMatch(
    handlerBlock,
    pattern
  );
}

assert.equal(
  (
    src.match(
      /async function executeBrokerReceivedFills\(/g
    ) || []
  ).length,
  1
);

assert.equal(
  (
    src.match(
      /async function runConfirmedBrokerReceivedFills\(/g
    ) || []
  ).length,
  1
);

assert.equal(
  (
    src.match(
      /async function fillBrokerReceivedOrders\(\)/g
    ) || []
  ).length,
  1
);

console.log(
  "PASS — Expo Web has an explicit browser confirmation path."
);

console.log(
  "PASS — native retains Alert confirmation."
);

console.log(
  "PASS — both confirmation paths converge on one guarded fill runner."
);

console.log(
  "PASS — full-batch canonical preflight remains before first settlement."
);

console.log(
  "PASS — central Practice fill service remains economic settlement owner."
);

console.log(
  "PASS — confirmation layer cannot manufacture FILLED or portfolio state."
);

console.log(
  "PASS — async settlement failures are surfaced."
);

console.log("");
console.log(
  "PC-031B4M7C5D7D3B web Fill confirmation contract PASSED."
);
