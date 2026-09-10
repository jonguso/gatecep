import assert from "node:assert/strict";
import { deriveApproximateScenarioQuantity } from "../src/features/trading/decisionAmountQuantityService.js";

let r=deriveApproximateScenarioQuantity({
  side:"SELL", decisionAmount:25000, currentPrice:103, availableQuantity:1800, existingQuantityText:""
});
assert.equal(r.available,true);
assert.equal(r.quantity,242);
assert.equal(r.grossValue,24926);
assert.equal(r.wasCapped,false);
console.log("PASS — SELL 25,000 at 103 derives 242 shares without exceeding intended gross.");

r=deriveApproximateScenarioQuantity({
  side:"SELL", decisionAmount:25000, currentPrice:103, availableQuantity:100, existingQuantityText:""
});
assert.equal(r.quantity,100);
assert.equal(r.wasCapped,true);
console.log("PASS — SELL quantity is capped to the actual holding.");

r=deriveApproximateScenarioQuantity({
  side:"BUY", decisionAmount:25000, currentPrice:103, percentChargeRate:0.0164, fixedCharges:0, existingQuantityText:""
});
assert.equal(r.available,true);
assert.equal(r.quantity,238);
assert.ok(r.estimatedTotalCost <= 25000);
assert.ok((239*103)*(1+0.0164) > 25000);
console.log("PASS — BUY quantity includes known percentage charges and stays within intended amount.");

r=deriveApproximateScenarioQuantity({
  side:"SELL", decisionAmount:25000, currentPrice:103, availableQuantity:1800, existingQuantityText:"17"
});
assert.equal(r.available,false);
assert.equal(r.reason,"MANUAL_QUANTITY_PRESENT");
console.log("PASS — manual quantity wins and is never overwritten.");

r=deriveApproximateScenarioQuantity({
  side:"SELL", decisionAmount:25000, currentPrice:0, availableQuantity:1800, existingQuantityText:""
});
assert.equal(r.available,false);
assert.equal(r.reason,"VALID_PRICE_REQUIRED");
console.log("PASS — missing current price never fabricates quantity.");
