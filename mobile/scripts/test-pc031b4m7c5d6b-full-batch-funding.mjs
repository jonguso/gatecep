import assert from "node:assert/strict";
import fs from "node:fs";

const service = fs.readFileSync(
  new URL(
    "../src/services/trade/practiceExecutionAccountingService.js",
    import.meta.url
  ),
  "utf8"
).replace(/\r\n/g, "\n");

function blockBetween(startToken, endToken) {
  const start = service.indexOf(startToken);
  const end = service.indexOf(endToken, start);

  assert.ok(
    start >= 0,
    `Missing start token: ${startToken}`
  );

  assert.ok(
    end > start,
    `Missing end token after: ${startToken}`
  );

  return service.slice(start, end);
}

const analysis = blockBetween(
  "export function analyzePracticeExecutionFunding(",
  "export async function analyzeCanonicalPracticeExecutionFunding("
);

const canonicalAnalysis = blockBetween(
  "export async function analyzeCanonicalPracticeExecutionFunding(",
  "export async function preflightCanonicalPracticeExecutionOrders("
);

const preflight = blockBetween(
  "export function preflightPracticeExecutionOrders(",
  "export function analyzePracticeExecutionFunding("
);

assert.match(
  analysis,
  /buildPracticeExecutionEstimate\s*\(/
);

assert.match(
  analysis,
  /applyPracticeExecutionToHoldings\s*\(/
);

assert.match(
  analysis,
  /additionalCashRequired/
);

assert.match(
  analysis,
  /totalBuyCost/
);

assert.match(
  analysis,
  /totalSellProceeds/
);

assert.match(
  analysis,
  /projectedEndingCash/
);

assert.match(
  analysis,
  /firstBlockedOrder/
);

assert.match(
  analysis,
  /workingCash\s*\+=\s*deficit/
);

assert.match(
  analysis,
  /side\s*===\s*"SELL"/
);

assert.doesNotMatch(
  analysis,
  /savePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  analysis,
  /userSetItem\s*\(/
);

assert.doesNotMatch(
  analysis,
  /settlePracticeExecutionOrder\s*\(/
);

assert.doesNotMatch(
  analysis,
  /markExecutionOrderFilled\s*\(/
);

assert.match(
  canonicalAnalysis,
  /loadInvestorContext\s*\(/
);

assert.match(
  canonicalAnalysis,
  /practice\?\.status\s*!==\s*"ACTIVE"/
);

assert.match(
  canonicalAnalysis,
  /analyzePracticeExecutionFunding\s*\(/
);

assert.match(
  preflight,
  /INSUFFICIENT_PRACTICE_CASH/
);

assert.match(
  preflight,
  /estimate\.remainingCash\s*<\s*0/
);

assert.doesNotMatch(
  preflight,
  /workingCash\s*\+=\s*deficit/
);

console.log(
  "PASS — full-batch funding analysis reuses canonical estimate semantics."
);

console.log(
  "PASS — analysis continues conceptually across BUY cash deficits."
);

console.log(
  "PASS — SELL proceeds participate in sequential funding analysis."
);

console.log(
  "PASS — funding analysis remains read-only."
);

console.log(
  "PASS — canonical execution preflight remains independently fail-closed."
);
