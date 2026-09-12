import assert from "node:assert/strict";
import { buildChargesAwareRecoveryBasket } from "../src/features/wealth-journey/goalRecoveryChargesAwareBasketService.js";

const allocation=[
  {symbol:"KNRE",sector:"Insurance",proposedAmount:18662.00,price:4.30},
  {symbol:"KPLC",sector:"Energy",proposedAmount:17920.00,price:22.40},
  {symbol:"EABL",sector:"Consumer",proposedAmount:17139.50,price:290.50}
];

const noFees=buildChargesAwareRecoveryBasket({allocation,accounts:[],recoveryAmount:53809.44});
assert.equal(noFees.available,true);
assert.equal(noFees.allChargesVerified,false);
assert.equal(noFees.estimatedCharges,null);
assert.equal(noFees.scenarioFundingRemainingAfterCharges,null);
assert.equal(noFees.remainingScenarioFundingMeaning,"BEFORE_UNAVAILABLE_CHARGES");
assert.equal(noFees.grossFundingRemainingBeforeCharges,87.94);
assert.equal(noFees.safeguards.chargesInvented,false);

const accounts=[{id:"ABC-1",brokerId:"ABC",brokerName:"ABC Capital",status:"ACTIVE",feeSchedule:{verified:true,source:"BROKER_PUBLISHED_FEE_SCHEDULE",verifiedAt:"2026-09-01T00:00:00.000Z",currency:"KES",commissionRatePct:1.3,otherChargesRatePct:0.34,minimumCommission:0,fixedCharges:0}}];
const withFees=buildChargesAwareRecoveryBasket({allocation,accounts,recoveryAmount:53809.44});
assert.equal(withFees.available,true);
assert.equal(withFees.allChargesVerified,true);
assert.ok(withFees.estimatedCharges>0);
assert.ok(withFees.estimatedTotalCost<=53809.44);
assert.ok(withFees.scenarioFundingRemainingAfterCharges>=0);
assert.equal(withFees.remainingScenarioFundingMeaning,"AFTER_VERIFIED_ESTIMATED_CHARGES");
assert.equal(withFees.safeguards.chargesInvented,false);

console.log("PASS — unknown charges expose only gross funding remaining before charges.");
console.log("PASS — unknown-charge residual is not promoted to post-charge spendable funding.");
console.log("PASS — verified schedules enable a distinct post-charge residual.");
console.log("PASS — charges remain evidence-gated and are never invented.");
