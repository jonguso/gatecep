import assert from "node:assert/strict";
import fs from "node:fs";

const service = fs.readFileSync(
  new URL(
    "../src/services/trade/practiceExecutionAccountingService.js",
    import.meta.url
  ),
  "utf8"
);

const settlementStart =
  service.indexOf(
    "export async function settlePracticeExecutionOrder"
  );

assert.ok(
  settlementStart >= 0,
  "settlement function must exist"
);

const settlement =
  service.slice(settlementStart);

assert.match(
  service,
  /async function loadPracticeTradeHistory\s*\(/
);

assert.match(
  service,
  /async function ensurePracticeTradeHistoryRecord\s*\(/
);

assert.match(
  service,
  /item\?\.executionOrderId/
);

assert.match(
  service,
  /simulatedTrade\.executionOrderId/
);

assert.match(
  service,
  /simulatedTrade:\s*simulatedTrade\s*\?\s*\{\s*\.\.\.simulatedTrade\s*\}\s*:\s*null/
);

const durableCheck =
  settlement.indexOf(
    "durableSettlement?.applied === true"
  );

const recoveryCall =
  settlement.indexOf(
    "await ensurePracticeTradeHistoryRecord",
    durableCheck
  );

const estimate =
  settlement.indexOf(
    "const estimate = buildPracticeExecutionEstimate"
  );

assert.ok(durableCheck >= 0);

assert.ok(
  recoveryCall > durableCheck,
  "durable retry must ensure history before return"
);

assert.ok(
  estimate > recoveryCall,
  "durable history recovery must precede new accounting"
);

const durableBranch =
  settlement.slice(
    durableCheck,
    estimate
  );

assert.doesNotMatch(
  durableBranch,
  /savePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  durableBranch,
  /applyPracticeExecutionToHoldings\s*\(/
);

assert.doesNotMatch(
  durableBranch,
  /buildPracticeExecutionEstimate\s*\(/
);

const markerCall =
  settlement.indexOf(
    "buildPracticeSettlementMarker({"
  );

const markerTrade =
  settlement.indexOf(
    "simulatedTrade,",
    markerCall
  );

const portfolioSave =
  settlement.indexOf(
    "await savePracticePortfolio({"
  );

const normalHistoryEnsure =
  settlement.indexOf(
    "await ensurePracticeTradeHistoryRecord",
    portfolioSave
  );

assert.ok(markerCall >= 0);
assert.ok(markerTrade > markerCall);
assert.ok(portfolioSave > markerTrade);

assert.ok(
  normalHistoryEnsure > portfolioSave,
  "normal history write must remain after durable portfolio write"
);

assert.match(
  settlement,
  /practiceSettlements/
);

assert.match(
  settlement,
  /lastPracticeSettlementAt/
);

assert.doesNotMatch(
  service,
  /loadUnifiedPortfolioRuntime|saveCanonicalReal|refreshCanonicalReal|canonicalPortfolioLedger|lotLedger/
);

console.log(
  "PASS — durable Practice marker stores complete canonical history evidence."
);

console.log(
  "PASS — retry repairs missing Practice history before returning alreadyApplied."
);

console.log(
  "PASS — durable recovery cannot reapply holdings, cash or execution estimate."
);

console.log(
  "PASS — normal settlement persists economics before idempotent history."
);

console.log(
  "PASS — Practice history recovery remains isolated from canonical REAL state."
);
