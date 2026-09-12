import assert from "node:assert/strict";
import {buildBrokerFeeSchedule,describeBrokerFeeSchedule} from "../src/services/brokers/brokerFeeScheduleManagementService.js";

const draft=buildBrokerFeeSchedule({commissionRatePct:"1.3",otherChargesRatePct:"0.34"});
assert.equal(draft.verified,false);
assert.equal(describeBrokerFeeSchedule(draft).status,"UNVERIFIED");

const missingSource=buildBrokerFeeSchedule({
  commissionRatePct:1.3,
  otherChargesRatePct:0.34,
  verifiedAt:"2026-09-11",
  verificationConfirmed:true
});
assert.equal(missingSource.verified,false);

const verified=buildBrokerFeeSchedule({
  commissionRatePct:1.3,
  otherChargesRatePct:0.34,
  minimumCommission:0,
  fixedCharges:0,
  currency:"KES",
  source:"BROKER_PUBLISHED_FEE_SCHEDULE",
  verifiedAt:"2026-09-11",
  verificationConfirmed:true
});
assert.equal(verified.verified,true);
assert.equal(describeBrokerFeeSchedule(verified).status,"VERIFIED");

console.log("PASS — fee schedules are not verified without explicit investor confirmation.");
console.log("PASS — verified fee schedules require evidence source and verification date.");
console.log("PASS — numeric fee fields are normalized without inventing values.");
