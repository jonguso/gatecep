
import assert from "node:assert/strict";
import {buildDiversifiedRecoveryPortfolioPreview} from "../src/features/wealth-journey/goalRecoveryPortfolioPreviewService.js";

const result=buildDiversifiedRecoveryPortfolioPreview({
  holdings:[
    {symbol:"KCB",sector:"Banking",marketValue:100000},
    {symbol:"SCOM",sector:"Telecom",marketValue:50000},
    {symbol:"KPLC0",sector:"Energy",marketValue:40000},
    {symbol:"KNRE0",sector:"Insurance",marketValue:30000},
    {symbol:"EABL0",sector:"Consumer",marketValue:20000}
  ],
  allocation:[
    {symbol:"KNRE",sector:"Insurance",proposedAmount:18659.70,approximateQuantity:4339,price:4.30},
    {symbol:"KPLC",sector:"Energy",proposedAmount:17932.70,approximateQuantity:800,price:22.40},
    {symbol:"EABL",sector:"Consumer",proposedAmount:17205.70,approximateQuantity:59,price:290.50}
  ],
  recoveryAmount:53798.10,realAvailableCash:0,realNetWorth:240000,
  goalContext:{goalName:"Family Security",targetAmount:1000000,targetDate:"2027-03-31",monthlyContribution:10000,projectedValueBeforeRecovery:943855.27,projectedShortfallBeforeRecovery:56144.73}
});
assert.equal(result.available,true);
assert.deepEqual(result.rows.map(x=>x.symbol),["KNRE","KPLC","EABL"]);
assert.equal(result.rows.some(x=>x.symbol==="ABSA"),false);
assert.equal(result.current.realAvailableCash,0);
assert.equal(result.projected.scenarioNetWorthBeforeCharges,293798.10);
assert.equal(result.detailedChargesApplied,false);
assert.equal(result.safeguards.realPortfolioMutated,false);
assert.equal(result.safeguards.chargesInvented,false);
const banking=result.sectorProjection.find(x=>x.sector==="Banking");
assert.ok(banking.projectedWeightPct<banking.currentWeightPct);
console.log("PASS — projected portfolio uses full KNRE/KPLC/EABL basket.");
console.log("PASS — recovery funding remains separate from REAL cash.");
console.log("PASS — current/projected sector weights are modeled.");
console.log("PASS — detailed charges are not fabricated.");
console.log("PASS — preview is read-only/advisory.");
