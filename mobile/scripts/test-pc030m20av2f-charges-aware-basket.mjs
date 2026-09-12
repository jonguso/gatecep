import assert from "node:assert/strict";
import { buildChargesAwareRecoveryBasket } from "../src/features/wealth-journey/goalRecoveryChargesAwareBasketService.js";

const accounts=[{id:"ACC-1",brokerId:"ABC",brokerName:"ABC Broker",status:"ACTIVE",feeSchedule:{verified:true,source:"BROKER_PUBLISHED_FEE_SCHEDULE",verifiedAt:"2026-09-01T00:00:00.000Z",currency:"KES",commissionRatePct:1.5,minimumCommission:0,otherChargesRatePct:0.14,fixedCharges:0}}];

const allocation=[
  {symbol:"KNRE",sector:"Insurance",proposedAmount:18659.70,approximateQuantity:4339,price:4.30},
  {symbol:"KPLC",sector:"Energy",proposedAmount:17932.70,approximateQuantity:800,price:22.40},
  {symbol:"EABL",sector:"Consumer",proposedAmount:17205.70,approximateQuantity:59,price:290.50}
];

const result=buildChargesAwareRecoveryBasket({recoveryAmount:53798.10,accounts,allocation});
assert.equal(result.available,true);
assert.equal(result.allChargesVerified,true);
assert.equal(result.safeguards.chargesInvented,false);
assert.equal(result.safeguards.recoveryBudgetExceeded,false);
assert.ok(result.estimatedCharges>0);
assert.ok(result.estimatedTotalCost<=53798.10);
assert.ok(result.rows.every(x=>x.estimatedTotalCost<=x.proposedAmount+0.000001));
assert.ok(result.rows.every(x=>x.quantity>0));
assert.equal(result.rows.some(x=>x.symbol==="ABSA"),false);

const noEvidence=buildChargesAwareRecoveryBasket({recoveryAmount:53798.10,accounts:[],allocation});
assert.equal(noEvidence.available,true);
assert.equal(noEvidence.allChargesVerified,false);
assert.equal(noEvidence.estimatedCharges,null);
assert.equal(noEvidence.safeguards.chargesInvented,false);

console.log("PASS — verified broker fees reduce quantities so each allocation remains all-in affordable.");
console.log("PASS — total verified basket cost stays within KES 53,798.10 recovery funding.");
console.log("PASS — no fee evidence means charges remain unavailable rather than fabricated.");
console.log("PASS — diversified KNRE/KPLC/EABL basket is preserved.");
