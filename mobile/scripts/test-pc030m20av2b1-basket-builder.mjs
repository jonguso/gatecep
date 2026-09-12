import assert from "node:assert/strict";
import { buildRecoveryBasketExecution } from "../src/features/wealth-journey/goalRecoveryBasketHandoffService.js";

const result = buildRecoveryBasketExecution({
  recoveryAmount: 53798.10,
  goalContext: {
    goalName: "Family Security",
    targetAmount: 1000000,
    targetDate: "2027-03-31",
    monthlyContribution: 10000
  },
  allocation: [
    { symbol: "KNRE", sector: "Insurance", proposedAmount: 18659.70, approximateQuantity: 4339, price: 4.30 },
    { symbol: "KPLC", sector: "Energy", proposedAmount: 17932.70, approximateQuantity: 800, price: 22.40 },
    { symbol: "EABL", sector: "Consumer", proposedAmount: 17205.70, approximateQuantity: 59, price: 290.50 }
  ]
});

assert.equal(result.ok, true);
assert.equal(result.execution.executionMode, "BROKER_HANDOFF_ONLY");
assert.equal(result.execution.orders.length, 3);
assert.deepEqual(result.execution.orders.map(x => x.symbol), ["KNRE", "KPLC", "EABL"]);
assert.equal(result.execution.orders.some(x => x.symbol === "ABSA"), false);
assert.equal(result.execution.scenarioFunding.amount, 53798.10);
assert.equal(result.execution.scenarioFunding.realCashMutationAllowed, false);
assert.equal(result.execution.orders.every(x => x.status === "REVIEW"), true);
assert.equal(result.execution.orders.every(x => x.advisoryOnly === true), true);
assert.equal(result.execution.orders.every(x => x.brokerExecutionConfirmed === false), true);
assert.equal(result.execution.reviewOrders, 3);
assert.equal(result.execution.activeOrders, 3);

console.log("PASS — AV2B1 pure builder preserves KNRE/KPLC/EABL as a three-order recovery basket.");
console.log("PASS — old ABSA single-stock state is not part of the basket handoff.");
console.log("PASS — recovery funding is temporary scenario funding, not REAL cash.");
console.log("PASS — execution remains REVIEW/advisory-only and compatible with canonical saveBasketExecution().");
