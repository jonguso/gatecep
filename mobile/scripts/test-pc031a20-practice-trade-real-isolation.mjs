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

  const end = trade.indexOf(
    "async function markBasketOrderFilled",
    start
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const body = trade.slice(start, end);

  const guard = body.indexOf(
    "isRealExecution(activeExecution)"
  );

  const omsLookup = body.indexOf(
    "findCurrentPracticeExecutionOrder()"
  );

  const basketSave = body.indexOf(
    "await saveTradeBasket"
  );

  assert.ok(guard >= 0);
  assert.ok(omsLookup > guard);
  assert.ok(basketSave > guard);

  assert.doesNotMatch(
    body,
    /await\s+persistTrade\s*\(/
  );

  assert.match(
    body,
    /Verified Broker Evidence Required/
  );

  assert.match(
    body,
    /await markBasketOrderFilled\s*\(/
  );

  assert.match(
    body,
    /await createBasketExecution\s*\(/
  );

  assert.match(
    body,
    /router\.push\("\/orders-review"\)/
  );

  console.log(
    "PASS: single Practice confirmation rejects REAL before canonical Practice OMS settlement or order creation."
  );

  console.log(
    "PASS: confirmTrade no longer bypasses canonical Practice accounting through persistTrade()."
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
// before canonical Practice settlement.
//
// PC-031B4M7C4 centralized whole-basket accounting:
//   REAL guard
//     -> aggregate Practice preflight
//     -> guarded central full-fill service.
//
// The runner must no longer mutate Practice holdings/cash/
// history or manufacture FILLED locally.
// --------------------------------------------------
{
  const start = trade.indexOf(
    "async function runBasketExecution"
  );

  const end = trade.indexOf(
    "const basketRemaining",
    start
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const basketRunner = trade.slice(
    start,
    end
  );

  const guard = basketRunner.indexOf(
    "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION"
  );

  const aggregatePreflight =
    basketRunner.indexOf(
      "await preflightCanonicalPracticeExecutionOrders"
    );

  const guardedFullFill =
    basketRunner.indexOf(
      "await markExecutionOrderFilled"
    );

  assert.ok(guard >= 0);
  assert.ok(aggregatePreflight > guard);
  assert.ok(guardedFullFill > aggregatePreflight);

  assert.doesNotMatch(
    basketRunner,
    /workingPortfolio/
  );

  assert.doesNotMatch(
    basketRunner,
    /workingCash/
  );

  assert.doesNotMatch(
    basketRunner,
    /savePracticePortfolio\s*\(/
  );

  assert.doesNotMatch(
    basketRunner,
    /userSetItem\s*\(\s*"practiceSimulatedTrades"/
  );

  assert.doesNotMatch(
    basketRunner,
    /saveBasketExecution\s*\(/
  );

  assert.doesNotMatch(
    basketRunner,
    /status:\s*"FILLED"/
  );

  console.log(
    "PASS: basket runner rejects REAL before canonical Practice settlement."
  );

  console.log(
    "PASS: basket runner preflights the complete Practice batch before first central fill."
  );

  console.log(
    "PASS: basket runner no longer owns Practice portfolio/history/FILLED mutation."
  );
}

// 7. trade.js must not manufacture OMS FILLED state.
//
// PC-031B4M7C4 removed the final direct Practice FILLED
// assignment from the whole-basket runner.
//
// All OMS-backed Practice full fills now delegate through
// markExecutionOrderFilled(), whose canonical service owns
// accounting-before-FILLED.
// --------------------------------------------------
{
  const directFilled =
    [...trade.matchAll(/status:\s*"FILLED"/g)];

  assert.equal(
    directFilled.length,
    0
  );

  const guardedFillCalls =
    [...trade.matchAll(/markExecutionOrderFilled\s*\(/g)];

  assert.ok(
    guardedFillCalls.length >= 2
  );

  assert.match(
    trade,
    /async function markBasketOrderFilled/
  );

  assert.match(
    trade,
    /async function runBasketExecution/
  );

  console.log(
    "PASS: trade.js no longer manufactures OMS FILLED state directly."
  );

  console.log(
    "PASS: OMS-backed Practice full fills delegate to the guarded central fill service."
  );
}

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
  /const transitionStatus\s*=[\s\S]*?completelyFilled[\s\S]*?\?\s*ORDER_STATUS\.FILLED[\s\S]*?:\s*ORDER_STATUS\.PARTIAL_FILL/
);

assert.match(
  recovery,
  /status:\s*transitionStatus/
);

console.log(
  "PASS: genuine REAL FILLED transition remains evidence-derived."
);

console.log("");
console.log(
  "PC-031A20 Practice Trade / REAL execution isolation tests PASSED."
);
