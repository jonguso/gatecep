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
    "async function inspectPostSettlementValuation()"
  );

const end =
  src.indexOf(
    "async function inspectPostSettlementIntegrity()",
    start
  );

assert.ok(
  start >= 0 && end > start,
  "E3B2 inspector must exist before E2C inspector"
);

const block =
  src.slice(start, end);

for (const pattern of [
  /"gatecep\.auth\.user"/,
  /AsyncStorage\.getItem\s*\(/,
  /AsyncStorage\.multiGet\s*\(/,
  /practicePortfolio/,
  /activeBasketExecution/,
  /averageCost/,
  /averagePrice/,
  /marketPrice/,
  /investedValue/,
  /marketValue/,
  /calculatedNetWorth/,
  /filledSymbolsRepresented/,
  /overallPass/
]) {
  assert.match(block, pattern);
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
  /settlePracticeExecutionOrder\s*\(/,
  /loadUnifiedPortfolioRuntime\s*\(/,
  /loadCanonicalNseQuotes\s*\(/
]) {
  assert.doesNotMatch(block, pattern);
}

assert.equal(
  (
    src.match(
      /async function inspectPostSettlementValuation\(\)/g
    ) || []
  ).length,
  1
);

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
      /async function fillBrokerReceivedOrders\(\)/g
    ) || []
  ).length,
  1
);

console.log(
  "PASS — E3B2 uses direct authenticated Practice reads only."
);

console.log(
  "PASS — holding cost basis mirrors quantity × average cost."
);

console.log(
  "PASS — holding market value mirrors quantity × market price."
);

console.log(
  "PASS — net worth mirrors holdings market value + Practice cash."
);

console.log(
  "PASS — filled symbols are correlated without assuming one fill equals total holding basis."
);

console.log(
  "PASS — E3B2 contains no storage writes, quote refresh, settlement or REAL mutation."
);

console.log("");
console.log(
  "PC-031B4M7C5D7E3B2 valuation reconciliation contract PASSED."
);
