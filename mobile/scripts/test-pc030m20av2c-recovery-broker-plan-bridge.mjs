import assert from "node:assert/strict";
import { buildRecoveryBrokerActionPlan } from "../src/features/wealth-journey/goalRecoveryBrokerActionPlanBridge.js";

const result = buildRecoveryBrokerActionPlan({
  execution: {
    orders: [
      { id:"1", symbol:"KNRE", side:"BUY", amount:18659.70, quantity:4339, price:4.30, status:"REVIEW" },
      { id:"2", symbol:"KPLC", side:"BUY", amount:17932.70, quantity:800, price:22.40, status:"REVIEW" },
      { id:"3", symbol:"EABL", side:"BUY", amount:17205.70, quantity:59, price:290.50, status:"REVIEW" }
    ]
  },
  recoveryAmount: 53798.10,
  goalContext: {
    goalName:"Family Security",
    targetAmount:1000000,
    targetDate:"2027-03-31",
    monthlyContribution:10000
  }
});

assert.equal(result.ok, true);
assert.equal(result.plan.executionMode, "BROKER_HANDOFF_ONLY");
assert.equal(result.plan.scenarioSource, "GOAL_RECOVERY");
assert.equal(result.plan.scenarioFunding.amount, 53798.10);
assert.equal(result.plan.scenarioFunding.realCashMutationAllowed, false);
assert.deepEqual(result.plan.orders.map(x => x.symbol), ["KNRE","KPLC","EABL"]);
assert.equal(result.plan.orders.some(x => x.symbol === "ABSA"), false);
assert.equal(result.plan.orders.every(x => x.status === "REVIEW"), true);
assert.equal(result.plan.orders.every(x => x.advisoryOnly === true), true);
assert.equal(result.plan.orders.every(x => x.brokerExecutionConfirmed === false), true);

console.log("PASS — recovery basket converts to canonical Broker Action Plan shape.");
console.log("PASS — KNRE/KPLC/EABL survive the bridge; ABSA is absent.");
console.log("PASS — scenario funding remains separate from REAL cash.");
console.log("PASS — all instructions remain REVIEW/advisory-only.");
