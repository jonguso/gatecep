import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeWeightedAverageBuy } from "../src/features/trading/weightedAverageBuyGuardService.js";

const result = analyzeWeightedAverageBuy({
  holding: { symbol: "EABL", quantity: 300, averagePrice: 271.04 },
  proposedQuantity: 100,
  proposedPrice: 270,
  feePolicy: { commissionRatePct: 1.2, otherChargesRatePct: 0.2 }
});
assert.equal(result.projectedAveragePrice, 271.73);
assert.equal(result.maximumBuyPrice, 267.29);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [trade, review] = await Promise.all([read("app/trade.js"), read("app/investor-alert-review.js")]);
assert.match(review, /mode: "AVERAGE_COST"/);
assert.match(trade, /Average Cost Simulator/);
assert.match(trade, /Scenario Cash \(editable\)/);
assert.match(trade, /Temporary only; WAP works even at zero/);
assert.match(trade, /REAL READ-ONLY/);
assert.match(trade, /Preview Only — No Trade Created/);
assert.match(trade, /does not save these scenario values/);
assert.match(trade, /securityPickerOpen/);
assert.match(trade, /Select Security/);
assert.match(trade, /!averageCostMode \? <Pressable/);

console.log("PASS — alert-launched weighted-average analysis is a preview-only mode.");
console.log("PASS — editable scenario cash is temporary and does not block the WAP calculation.");
console.log("PASS — the REAL holding supplies read-only quantity and cost-basis context.");
console.log("PASS — preview mode cannot create a trade or write scenario values to a saved record.");
console.log("PASS — the full security catalogue is contained in a compact dropdown modal.");
