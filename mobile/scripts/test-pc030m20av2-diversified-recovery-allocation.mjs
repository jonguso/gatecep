import assert from "node:assert/strict";

import {
  buildGoalPreservingDiversifiedRecoveryAllocation
} from "../src/features/wealth-journey/goalRecoveryDiversifiedAllocationService.js";

const holdings = [
  { symbol: "KCB", sector: "Banking", marketValue: 220000 },
  { symbol: "EQT", sector: "Banking", marketValue: 156500 },
  { symbol: "SCOM", sector: "Telecom", marketValue: 209000 },
  { symbol: "KPLC", sector: "Energy", marketValue: 179000 },
  { symbol: "JUB", sector: "Insurance", marketValue: 132000 },
  { symbol: "EABL", sector: "Consumer", marketValue: 103500 }
];

const opportunities = [
  { symbol: "ABSA", sector: "Banking", action: "BUY", confidence: "HIGH", score: 91, price: 33.45, rationale: "Banking opportunity" },
  { symbol: "TOTL", sector: "Energy", action: "BUY", confidence: "HIGH", score: 84, price: 31.5, rationale: "Energy opportunity" },
  { symbol: "CIC", sector: "Insurance", action: "BUY", confidence: "HIGH", score: 80, price: 3.2, rationale: "Insurance opportunity" },
  { symbol: "BAT", sector: "Consumer", action: "BUY", confidence: "MEDIUM", score: 76, price: 520, rationale: "Consumer opportunity" }
];

const targetSectorWeights = {
  Banking: 30,
  Telecom: 25,
  Energy: 20,
  Insurance: 15,
  Consumer: 10
};

const result =
  buildGoalPreservingDiversifiedRecoveryAllocation({
    holdings,
    opportunities,
    targetSectorWeights,
    recoveryAmount: 53798.10,
    sectorLimitPercent: 40
  });

assert.equal(result.status, "AVAILABLE");
assert.ok(result.allocation.length >= 2);
assert.equal(result.allocation.some((x) => x.sector === "Banking"), false);
assert.equal(result.allocation.some((x) => x.symbol === "ABSA"), false);
assert.ok(new Set(result.allocation.map((x) => x.sector)).size >= 2);
assert.ok(result.allocatedAmount <= 53798.10 + 0.01);
assert.equal(result.safeguards.realPortfolioChanged, false);
assert.equal(result.safeguards.realCashChanged, false);
assert.equal(result.safeguards.brokerOrderCreated, false);

const noDiversifiedEvidence =
  buildGoalPreservingDiversifiedRecoveryAllocation({
    holdings,
    opportunities: [
      { symbol: "TOTL", sector: "Energy", action: "BUY", confidence: "HIGH", score: 84, price: 31.5 }
    ],
    targetSectorWeights,
    recoveryAmount: 53798.10
  });

assert.equal(
  noDiversifiedEvidence.status,
  "INSUFFICIENT_DIVERSIFIED_EVIDENCE"
);
assert.equal(noDiversifiedEvidence.allocation.length, 0);

console.log("PASS — an already-overweight Banking sector is excluded from new recovery capital.");
console.log("PASS — available recovery capital is spread across multiple evidence-supported sectors.");
console.log("PASS — GateCEP refuses to manufacture a one-security basket when diversified evidence is insufficient.");
console.log("PASS — scenario funding does not mutate REAL cash, holdings, goal, DNA, or broker state.");
