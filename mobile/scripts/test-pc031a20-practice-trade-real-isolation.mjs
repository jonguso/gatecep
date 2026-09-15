import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const trade = await readFile(
  new URL("../app/trade.js", import.meta.url),
  "utf8"
);

const store = await readFile(
  new URL(
    "../src/services/trade/basketExecutionStore.js",
    import.meta.url
  ),
  "utf8"
);

const recovery = await readFile(
  new URL(
    "../src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js",
    import.meta.url
  ),
  "utf8"
);

// --------------------------------------------------
// 1. Practice Trade has an explicit REAL/PRACTICE
// execution-mode classifier.
// --------------------------------------------------
assert.match(
  trade,
  /function executionModeOf\(execution\)/
);

assert.match(
  trade,
  /function isRealExecution\(execution\)/
);

console.log(
  "PASS: Practice Trade has an explicit REAL/PRACTICE execution boundary."
);

// --------------------------------------------------
// 2. REAL OMS executions cannot become active
// Practice simulator baskets.
// --------------------------------------------------
assert.match(
  trade,
  /execution\?\.orders\?\.length[\s\S]*!isRealExecution\(execution\)[\s\S]*setActiveExecution\(execution\)/
);

assert.match(
  trade,
  /isRealExecution\(execution\)[\s\S]*setActiveExecution\(null\)/
);

console.log(
  "PASS: REAL OMS executions are not loaded into the Practice simulator."
);

// --------------------------------------------------
// 3. confirmTrade blocks REAL before simulated
// portfolio mutation.
// --------------------------------------------------
{
  const start = trade.indexOf(
    "async function confirmTrade()"
  );

  const persist = trade.indexOf(
    "await persistTrade",
    start
  );

  const guard = trade.indexOf(
    "isRealExecution(activeExecution)",
    start
  );

  assert.ok(start >= 0);
  assert.ok(guard > start);
  assert.ok(persist > guard);

  console.log(
    "PASS: single Practice confirmation rejects REAL execution before portfolio persistence."
  );
}

// --------------------------------------------------
// 4. Single OMS simulated fill uses A19 guarded
// Practice-only service instead of generic update.
// --------------------------------------------------
{
  const start = trade.indexOf(
    "async function markBasketOrderFilled"
  );

  const end = trade.indexOf(
    "async function executeEntireBasket",
    start
  );

  const body = trade.slice(start, end);

  assert.match(
    body,
    /markExecutionOrderFilled/
  );

  assert.doesNotMatch(
    body,
    /updateExecutionOrder/
  );

  assert.doesNotMatch(
    body,
    /status:\s*"FILLED"/
  );

  console.log(
    "PASS: single simulated basket completion uses the guarded Practice fill service."
  );
}

// --------------------------------------------------
// 5. Whole-basket simulation entry point blocks REAL.
// --------------------------------------------------
{
  const start = trade.indexOf(
    "async function executeEntireBasket"
  );

  const end = trade.indexOf(
    "async function runBasketExecution",
    start
  );

  const body = trade.slice(start, end);

  assert.match(
    body,
    /isRealExecution\(activeExecution\)/
  );

  assert.match(
    body,
    /Verified Broker Evidence Required/
  );

  console.log(
    "PASS: whole-basket Practice execution UI blocks REAL baskets."
  );
}

// --------------------------------------------------
// 6. Basket runner itself also fails closed for REAL
// before Practice cash/portfolio mutation.
// --------------------------------------------------
{
  const start = trade.indexOf(
    "async function runBasketExecution"
  );

  const guard = trade.indexOf(
    "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION",
    start
  );

  const workingPortfolio = trade.indexOf(
    "let workingPortfolio",
    start
  );

  const practiceSave = trade.indexOf(
    "savePracticePortfolio",
    start
  );

  assert.ok(start >= 0);
  assert.ok(guard > start);
  assert.ok(workingPortfolio > guard);
  assert.ok(practiceSave > guard);

  console.log(
    "PASS: basket runner rejects REAL before Practice portfolio or cash mutation."
  );
}

// --------------------------------------------------
// 7. Remaining direct FILLED assignment in trade.js
// belongs only to guarded Practice basket simulation.
// --------------------------------------------------
{
  const directFilled =
    [...trade.matchAll(/status:\s*"FILLED"/g)];

  assert.equal(
    directFilled.length,
    1
  );

  const runnerStart = trade.indexOf(
    "async function runBasketExecution"
  );

  assert.ok(
    directFilled[0].index > runnerStart
  );

  console.log(
    "PASS: the only remaining direct trade.js FILLED assignment is inside the guarded Practice basket runner."
  );
}

// --------------------------------------------------
// 8. Practice mutations remain Practice-specific.
// --------------------------------------------------
assert.match(
  trade,
  /savePracticePortfolio/
);

assert.match(
  trade,
  /"practiceSimulatedTrades"/
);

assert.match(
  trade,
  /source:\s*"TRADE_SIMULATION"/
);

console.log(
  "PASS: simulator portfolio and history mutations remain explicitly Practice-scoped."
);

// --------------------------------------------------
// 9. Store-level manual full fill still rejects REAL.
// --------------------------------------------------
assert.match(
  store,
  /export async function markExecutionOrderFilled/
);

assert.match(
  store,
  /REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION/
);

console.log(
  "PASS: service-level REAL manual full-fill guard remains intact."
);

// --------------------------------------------------
// 10. Genuine REAL completion remains in verified
// broker evidence recovery.
// --------------------------------------------------
assert.match(
  recovery,
  /verifiedExecutionEvidence/
);

assert.match(
  recovery,
  /status:\s*ORDER_STATUS\.FILLED/
);

console.log(
  "PASS: genuine REAL FILLED transition remains evidence-derived."
);

console.log("");
console.log(
  "PC-031A20 Practice Trade / REAL execution isolation tests PASSED."
);
