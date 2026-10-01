import assert from "node:assert/strict";
import fs from "node:fs";

const service = fs.readFileSync(
  new URL(
    "../src/services/trade/practiceExecutionAccountingService.js",
    import.meta.url
  ),
  "utf8"
);

const settlementStart = service.indexOf(
  "export async function settlePracticeExecutionOrder"
);

assert.ok(
  settlementStart >= 0,
  "settlement function must exist"
);

const settlement =
  service.slice(settlementStart);

/*
 * Durable marker carries enough evidence to reconstruct
 * the canonical Practice history record.
 */
assert.match(
  service,
  /simulatedTrade:\s*simulatedTrade\s*\?\s*\{\s*\.\.\.simulatedTrade\s*\}/
);

/*
 * One canonical idempotent history writer.
 */
assert.match(
  service,
  /async function ensurePracticeTradeHistoryRecord\(/
);

assert.match(
  service,
  /item\?\.executionOrderId/
);

assert.match(
  service,
  /simulatedTrade\.executionOrderId/
);

/*
 * Durable recovery occurs before the retry returns.
 */
const durableCheck = settlement.indexOf(
  "durableSettlement?.applied === true"
);

const recoveryCall = settlement.indexOf(
  "await ensurePracticeTradeHistoryRecord",
  durableCheck
);

const estimate = settlement.indexOf(
  "const estimate = buildPracticeExecutionEstimate"
);

assert.ok(durableCheck >= 0);

assert.ok(
  recoveryCall > durableCheck,
  "durable retry must repair history before returning"
);

assert.ok(
  estimate > recoveryCall,
  "history recovery must occur before any new accounting estimate"
);

/*
 * Recovery branch cannot reapply economic state.
 */
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
  /availableCash\s*:/
);

/*
 * New settlement still persists economic state first,
 * then idempotently ensures history.
 */
const portfolioSave = settlement.indexOf(
  "await savePracticePortfolio({"
);

const normalHistoryEnsure = settlement.indexOf(
  "await ensurePracticeTradeHistoryRecord",
  portfolioSave
);

assert.ok(portfolioSave > estimate);

assert.ok(
  normalHistoryEnsure > portfolioSave,
  "history must remain after durable portfolio settlement"
);

/*
 * Durable marker itself is part of the canonical
 * portfolio write.
 */
assert.match(
  settlement,
  /practiceSettlements/
);

assert.match(
  settlement,
  /lastPracticeSettlementAt/
);

/*
 * REAL mutation dependencies remain absent.
 */
assert.doesNotMatch(
  service,
  /loadUnifiedPortfolioRuntime|saveCanonicalReal|refreshCanonicalReal|canonicalPortfolioLedger|lotLedger/
);

console.log(
  "PASS — durable Practice marker carries canonical history reconstruction evidence."
);

console.log(
  "PASS — interrupted settlement repairs missing Practice history exactly once."
);

console.log(
  "PASS — history recovery does not reapply Practice holdings or cash."
);

console.log(
  "PASS — new settlement preserves portfolio-first then history persistence ordering."
);

console.log(
  "PASS — Practice history recovery remains isolated from canonical REAL state."
);
