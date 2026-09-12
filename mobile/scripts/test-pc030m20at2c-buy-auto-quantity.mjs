import assert from "node:assert/strict";
import { deriveApproximateScenarioQuantity } from "../src/features/trading/decisionAmountQuantityService.js";

const buy = deriveApproximateScenarioQuantity({
  side: "BUY",
  decisionAmount: 25000,
  currentPrice: 37,
  availableQuantity: 0,
  percentChargeRate: 0.0164,
  fixedCharges: 0,
  existingQuantityText: ""
});

assert.equal(buy.available, true);
assert.equal(buy.action, "BUY");
assert.equal(buy.quantity, 664);
assert.ok(buy.estimatedTotalCost <= 25000);
console.log("PASS — BUY 25,000 at KES 37 derives 664 shares including known percentage charges.");

const buyNotHeld = deriveApproximateScenarioQuantity({
  side: "BUY",
  decisionAmount: 25000,
  currentPrice: 37,
  availableQuantity: null,
  percentChargeRate: 0.0164,
  fixedCharges: 0,
  existingQuantityText: ""
});

assert.equal(buyNotHeld.available, true);
assert.equal(buyNotHeld.quantity, 664);
console.log("PASS — BUY quantity does not require an existing holding.");

const manual = deriveApproximateScenarioQuantity({
  side: "BUY",
  decisionAmount: 25000,
  currentPrice: 37,
  percentChargeRate: 0.0164,
  existingQuantityText: "500"
});
assert.equal(manual.available, false);
assert.equal(manual.reason, "MANUAL_QUANTITY_PRESENT");
console.log("PASS — manual quantity still wins.");
