import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(
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
  "post-settlement inspector boundaries must exist"
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

assert.equal(
  (
    src.match(
      /window\.confirm\s*\(/g
    ) || []
  ).length,
  1
);

console.log(
  "PASS — E2B reads the authenticated backend-ID namespace directly."
);

console.log(
  "PASS — Practice portfolio, durable settlements, history and OMS are correlated."
);

console.log(
  "PASS — inspector contains no migration, storage-write or settlement calls."
);

console.log(
  "PASS — D7D3B Fill Received orchestration remains unique."
);

console.log(
  "PASS — Expo Web confirmation boundary remains present."
);

console.log("");
console.log(
  "PC-031B4M7C5D7E2B post-settlement inspector contract PASSED."
);
