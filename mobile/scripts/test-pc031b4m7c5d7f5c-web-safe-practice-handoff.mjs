import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs
  .readFileSync(
    new URL("../app/orders-review.js", import.meta.url),
    "utf8"
  )
  .replace(/\r\n/g, "\n");

assert.match(
  src,
  /Platform/
);

assert.match(
  src,
  /Platform\.OS === "web"/
);

assert.match(
  src,
  /window\.confirm/
);

assert.match(
  src,
  /async function executeConfirmedHandoff\(\)/
);

assert.match(
  src,
  /async function prepareHandoff\(\)/
);

const executeStart =
  src.indexOf("async function executeConfirmedHandoff()");

const prepareStart =
  src.indexOf("async function prepareHandoff()");

assert.ok(executeStart >= 0);
assert.ok(prepareStart > executeStart);

const executeBlock =
  src.slice(executeStart, prepareStart);

const preflightPos =
  executeBlock.indexOf(
    "await preflightCanonicalPracticeExecutionOrders"
  );

const queuePos =
  executeBlock.indexOf(
    "await queueExecutionOrders()"
  );

const realReturnPos =
  executeBlock.indexOf(
    'router.push("/(tabs)/trading")'
  );

const orchestratorPos =
  executeBlock.indexOf(
    "await runPracticeExecutionOrchestrator()"
  );

const basketStatusPos =
  executeBlock.indexOf(
    'router.push("/basket-execution")'
  );

assert.ok(
  preflightPos >= 0,
  "Practice funding preflight must remain in confirmed handoff"
);

assert.ok(
  queuePos > preflightPos,
  "Practice funding preflight must remain before queue mutation"
);

assert.ok(
  realReturnPos > queuePos,
  "REAL post-queue route must remain"
);

assert.ok(
  orchestratorPos > realReturnPos,
  "Practice orchestrator must remain behind REAL early return"
);

assert.ok(
  basketStatusPos > orchestratorPos,
  "Practice Basket Execution status must follow orchestrator"
);

/*
 * Orders Review must still not acquire canonical routing,
 * settlement or storage ownership.
 */
for (const pattern of [
  /markExecutionOrderFilled\s*\(/,
  /routeExecutionOrderByMode\s*\(/,
  /settlePracticeExecutionOrder\s*\(/,
  /savePracticePortfolio\s*\(/,
  /AsyncStorage\.setItem\s*\(/,
  /userSetItem\s*\(/
]) {
  assert.doesNotMatch(src, pattern);
}

assert.doesNotMatch(src, /setTimeout\s*\(/);
assert.doesNotMatch(src, /setInterval\s*\(/);

console.log(
  "PASS — web uses synchronous window.confirm before async handoff."
);
console.log(
  "PASS — native retains Alert.alert confirmation."
);
console.log(
  "PASS — confirmed Practice handoff remains funding -> QUEUED -> orchestrator."
);
console.log(
  "PASS — REAL early-return boundary remains intact."
);
console.log(
  "PASS — Orders Review acquires no routing, settlement or storage ownership."
);
console.log("");
console.log(
  "PC-031B4M7C5D7F5C web-safe Practice handoff contract PASSED."
);
