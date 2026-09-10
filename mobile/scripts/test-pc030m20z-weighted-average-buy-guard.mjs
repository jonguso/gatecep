import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeWeightedAverageBuy } from "../src/features/trading/weightedAverageBuyGuardService.js";

const holding = { symbol: "EABL", quantity: 300, averagePrice: 271.04 };
const feePolicy = { commissionRatePct: 1.2, otherChargesRatePct: 0.2, minimumCommission: 0, fixedCharges: 0 };

const at270 = analyzeWeightedAverageBuy({ holding, proposedQuantity: 100, proposedPrice: 270, feePolicy });
assert.equal(at270.status, "WAIT_FOR_LOWER_ALL_IN_PRICE");
assert.equal(at270.estimatedCharges, 378);
assert.equal(at270.allInUnitCost, 273.78);
assert.equal(at270.projectedAveragePrice, 271.73);
assert.equal(at270.maximumBuyPrice, 267.29);
assert.match(at270.recommendation, /KES 267\.29 or lower/);

const at267 = analyzeWeightedAverageBuy({ holding, proposedQuantity: 100, proposedPrice: 267, feePolicy });
assert.equal(at267.status, "DOES_NOT_RAISE_AVERAGE");
assert.equal(at267.raisesAverage, false);
assert.ok(at267.projectedAveragePrice < 271.04);

const missingFees = analyzeWeightedAverageBuy({ holding, proposedQuantity: 100, proposedPrice: 267 });
assert.equal(missingFees.status, "FEE_EVIDENCE_REQUIRED");

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [trade, review] = await Promise.all([read("app/trade.js"), read("app/investor-alert-review.js")]);
assert.match(trade, /Coach G Weighted Average Check/);
assert.match(trade, /Maximum Limit Price Without Raising Average/);
assert.match(trade, /A lower weighted average is not by itself a reason to buy/);
assert.match(review, /Simulate Weighted Average Before Adding/);

console.log("PASS — all-in acquisition cost includes brokerage and regulatory charges.");
console.log("PASS — buying EABL at KES 270 raises a KES 271.04 weighted average after charges.");
console.log("PASS — the safe illustrative limit is floored to KES 267.29 for 100 shares under the displayed fee assumptions.");
console.log("PASS — missing fee evidence cannot produce a fabricated exact threshold.");
console.log("PASS — Coach G presents the check as a Practice scenario, not a reason or instruction to trade.");
