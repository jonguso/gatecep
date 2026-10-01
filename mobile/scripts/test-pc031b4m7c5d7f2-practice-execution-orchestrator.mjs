import assert from "node:assert/strict";
import fs from "node:fs";

const src =
  fs.readFileSync(
    new URL(
      "../src/services/trade/practiceExecutionOrchestrator.js",
      import.meta.url
    ),
    "utf8"
  ).replace(/\r\n/g, "\n");

assert.match(
  src,
  /loadBasketExecution/
);

assert.match(
  src,
  /routeExecutionOrderByMode/
);

assert.match(
  src,
  /markExecutionOrderFilled/
);

assert.match(
  src,
  /preflightCanonicalPracticeExecutionOrders/
);

assert.match(
  src,
  /PRACTICE_ORCHESTRATOR_REAL_EXECUTION_FORBIDDEN/
);

assert.match(
  src,
  /ORDER_STATUS\.QUEUED/
);

assert.match(
  src,
  /ORDER_STATUS\.BROKER_RECEIVED/
);

assert.match(
  src,
  /ORDER_STATUS\.PARTIAL_FILL/
);

assert.match(
  src,
  /await routeExecutionOrderByMode\([\s\S]*?order\.id[\s\S]*?\)/
);

const routePos =
  src.indexOf(
    "await routeExecutionOrderByMode"
  );

const reloadAfterRoutePos =
  src.indexOf(
    "execution =\n    await loadBasketExecution()",
    routePos
  );

const preflightPos =
  src.indexOf(
    "await preflightCanonicalPracticeExecutionOrders",
    routePos
  );

const fillPos =
  src.indexOf(
    "await markExecutionOrderFilled",
    routePos
  );

assert.ok(
  routePos >= 0,
  "Practice routing must use canonical routing authority"
);

assert.ok(
  reloadAfterRoutePos > routePos,
  "persisted OMS state must reload after routing"
);

assert.ok(
  preflightPos > reloadAfterRoutePos,
  "aggregate preflight must use persisted post-routing state"
);

assert.ok(
  fillPos > preflightPos,
  "aggregate preflight must precede first canonical fill"
);

assert.match(
  src,
  /source:\s*"GATECEP_BROKER_PRACTICE_ORCHESTRATOR"/
);

assert.match(
  src,
  /export async function inspectPracticeExecutionOrchestrator/
);

assert.match(
  src,
  /export async function runPracticeExecutionOrchestrator/
);

assert.match(
  src,
  /export async function resumePracticeExecutionOrchestrator/
);

assert.match(
  src,
  /return await runPracticeExecutionOrchestrator\(\)/
);

/*
 * The orchestrator must compose existing authorities rather than
 * creating a second storage/accounting implementation.
 */
for (const pattern of [
  /userSetItem\s*\(/,
  /AsyncStorage\.setItem\s*\(/,
  /AsyncStorage\.multiSet\s*\(/,
  /savePracticePortfolio\s*\(/,
  /settlePracticeExecutionOrder\s*\(/,
  /practiceSimulatedTrades/,
  /practiceSettlements/,
  /availableCash\s*:/,
  /status\s*:\s*ORDER_STATUS\.FILLED/,
  /status\s*:\s*ORDER_STATUS\.ROUTED/,
  /status\s*:\s*ORDER_STATUS\.BROKER_RECEIVED/
]) {
  assert.doesNotMatch(
    src,
    pattern
  );
}

/*
 * D7F2 is service-layer only. No UI timer/background illusion.
 */
for (const pattern of [
  /setTimeout\s*\(/,
  /setInterval\s*\(/,
  /requestAnimationFrame\s*\(/,
  /AppState/,
  /useEffect\s*\(/,
  /useState\s*\(/
]) {
  assert.doesNotMatch(
    src,
    pattern
  );
}

console.log(
  "PASS — D7F2 derives execution progress from persisted OMS state."
);

console.log(
  "PASS — Practice routing remains owned by routeExecutionOrderByMode()."
);

console.log(
  "PASS — aggregate Practice affordability precedes the first economic fill."
);

console.log(
  "PASS — Practice settlement remains owned by markExecutionOrderFilled()."
);

console.log(
  "PASS — REAL execution is explicitly forbidden."
);

console.log(
  "PASS — recovery reuses the same persisted idempotent state machine."
);

console.log(
  "PASS — no React timer, direct storage writer or duplicate settlement path added."
);

console.log("");
console.log(
  "PC-031B4M7C5D7F2 persisted Practice execution orchestrator contract PASSED."
);
