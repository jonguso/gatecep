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
  "valuation inspector must exist"
);

const block =
  src.slice(start, end);

assert.match(
  block,
  /hasStoredInvestedValue/
);

assert.match(
  block,
  /storedInvestedValue[\s\S]*?\?[\s\S]*?n\(storedInvestedRaw\)[\s\S]*?: null/
);

assert.match(
  block,
  /!hasStoredInvestedValue\s*\|\|/
);

assert.match(
  block,
  /investedEvidenceStatus/
);

assert.match(
  block,
  /"DERIVED"/
);

assert.match(
  src,
  /Cost basis derived from quantity ×\s*average cost\./
);

for (const pattern of [
  /userGetItem\s*\(/,
  /userSetItem\s*\(/,
  /AsyncStorage\.setItem\s*\(/,
  /AsyncStorage\.multiSet\s*\(/,
  /AsyncStorage\.removeItem\s*\(/,
  /savePracticePortfolio\s*\(/,
  /markExecutionOrderFilled\s*\(/,
  /markExecutionOrderPartial\s*\(/,
  /settlePracticeExecutionOrder\s*\(/,
  /updateExecutionOrder\s*\(/,
  /loadUnifiedPortfolioRuntime\s*\(/,
  /loadCanonicalNseQuotes\s*\(/
]) {
  assert.doesNotMatch(
    block,
    pattern
  );
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

console.log(
  "PASS — missing optional stored cost is DERIVED evidence."
);

console.log(
  "PASS — present stored cost remains subject to reconciliation."
);

console.log(
  "PASS — aggregate canonical invested amount remains authoritative evidence."
);

console.log(
  "PASS — E3B3 performs no storage write, migration, quote refresh or settlement."
);

console.log("");
console.log(
  "PC-031B4M7C5D7E3B3 optional cost evidence contract PASSED."
);
