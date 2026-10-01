import assert from "node:assert/strict";
import fs from "node:fs";

const src =
  fs.readFileSync(
    new URL(
      "../app/queue-manager.js",
      import.meta.url
    ),
    "utf8"
  ).replace(/\r\n/g, "\n");

const start =
  src.indexOf(
    "async function inspectPostSettlementIntegrity()"
  );

const end =
  src.indexOf(
    "async function executeBrokerReceivedFills(",
    start
  );

assert.ok(
  start >= 0 && end > start,
  "inspector must exist before Fill executor"
);

const block =
  src.slice(start, end);

for (const pattern of [
  /"gatecep\.auth\.user"/,
  /AsyncStorage\.getItem\s*\(/,
  /AsyncStorage\.multiGet\s*\(/,
  /practicePortfolio/,
  /practiceSimulatedTrades/,
  /activeBasketExecution/,
  /practiceSettlements/,
  /executionOrderId/,
  /historyCount/,
  /omsAccountingApplied/,
  /fullyCorrelated/
]) {
  assert.match(
    block,
    pattern
  );
}

for (const pattern of [
  /userGetItem\s*\(/,
  /userSetItem\s*\(/,
  /AsyncStorage\.setItem\s*\(/,
  /AsyncStorage\.multiSet\s*\(/,
  /AsyncStorage\.removeItem\s*\(/,
  /savePracticePortfolio\s*\(/,
  /markExecutionOrderFilled\s*\(/,
  /markExecutionOrderPartial\s*\(/,
  /updateExecutionOrder\s*\(/,
  /settlePracticeExecutionOrder\s*\(/
]) {
  assert.doesNotMatch(
    block,
    pattern
  );
}

assert.equal(
  (
    src.match(
      /async function inspectPostSettlementIntegrity\(\)/g
    ) || []
  ).length,
  1
);

assert.equal(
  (
    src.match(
      /Inspect Post-Settlement Integrity/g
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

assert.equal(
  (
    src.match(
      /async function executeBrokerReceivedFills\(/g
    ) || []
  ).length,
  1
);

/*
 * PC-031B4M7C5D7H4B
 *
 * Queue Manager now has two legitimate web confirmation
 * boundaries:
 *
 *   1. guarded closed-Practice-execution release
 *   2. Practice Fill Received
 *
 * E2C owns only the Fill Received contract. Do not assert
 * global window.confirm uniqueness because the release
 * confirmation is an independent lifecycle boundary.
 */
const fillStart =
  src.indexOf(
    "async function fillBrokerReceivedOrders()"
  );

const fillEnd =
  src.indexOf(
    "async function markPartial(",
    fillStart
  );

assert.ok(
  fillStart >= 0 && fillEnd > fillStart,
  "Fill Received confirmation boundary must exist"
);

const fillBlock =
  src.slice(
    fillStart,
    fillEnd
  );

assert.equal(
  (
    fillBlock.match(
      /window\.confirm\s*\(/g
    ) || []
  ).length,
  1
);

assert.match(
  fillBlock,
  /await\s+runConfirmedBrokerReceivedFills\s*\(/
);

assert.match(
  fillBlock,
  /Platform\.OS\s*===\s*["']web["']/
);

console.log(
  "PASS — inspector uses direct authenticated AsyncStorage reads."
);

console.log(
  "PASS — inspector correlates Practice settlement, history and OMS evidence."
);

console.log(
  "PASS — inspector contains no migration or mutation calls."
);

console.log(
  "PASS — D7D3B Fill Received path remains structurally intact."
);

console.log("");
console.log(
  "PC-031B4M7C5D7E2C post-settlement inspector contract PASSED."
);
