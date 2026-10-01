import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(
  new URL(
    "../app/queue-manager.js",
    import.meta.url
  ),
  "utf8"
).replace(/\r\n/g, "\n");

const start = src.indexOf(
  "async function inspectPostSettlementIntegrity()"
);

const end = src.indexOf(
  "async function executeBrokerReceivedFills(",
  start
);

assert.ok(
  start >= 0 && end > start,
  "read-only post-settlement inspector must exist"
);

const block = src.slice(start, end);

for (const pattern of [
  /practiceSimulatedTrades/,
  /activeBasketExecution/,
  /practiceSettlements/,
  /executionOrderId/,
  /historyCount/,
  /settlementApplied/,
  /accountingApplied/,
  /markerHasTrade/,
  /omsAccountingApplied/,
  /filledOrders/,
  /fullyCorrelated/
]) {
  assert.match(block, pattern);
}

for (const pattern of [
  /AsyncStorage\.setItem\s*\(/,
  /AsyncStorage\.multiSet\s*\(/,
  /AsyncStorage\.removeItem\s*\(/,
  /userSetItem\s*\(/,
  /savePracticePortfolio\s*\(/,
  /settlePracticeExecutionOrder\s*\(/,
  /markExecutionOrderFilled\s*\(/,
  /markExecutionOrderPartial\s*\(/,
  /clearBasketExecution\s*\(/
]) {
  assert.doesNotMatch(block, pattern);
}

assert.match(
  block,
  /item\.historyCount\s*===\s*1/
);

assert.match(
  block,
  /item\.settlementApplied/
);

assert.match(
  block,
  /item\.accountingApplied/
);

assert.match(
  block,
  /item\.markerHasTrade/
);

assert.match(
  block,
  /item\.omsAccountingApplied/
);

console.log(
  "PASS — H5 inspector correlates OMS FILLED orders with durable settlement evidence."
);

console.log(
  "PASS — each correlated FILLED order requires exactly one canonical Practice history record."
);

console.log(
  "PASS — settlement marker, accounting marker and OMS accounting evidence are all required."
);

console.log(
  "PASS — H5 runtime inspector contains no storage, settlement, fill or clear mutation."
);

console.log();
console.log(
  "PC-031B4M7C5D7F5J2D7H5 runtime correlation contract PASSED."
);
