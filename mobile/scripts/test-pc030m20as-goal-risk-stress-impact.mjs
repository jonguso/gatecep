import assert from "node:assert/strict";
import { buildGoalRiskStressImpact, extractVerifiedGoalEvidence } from "../src/features/trading/coachGGoalRiskStressImpactService.js";

const holdings=[
 {symbol:"SCOM",sector:"Telecom",quantity:1000,marketValue:25000},
 {symbol:"KCB",sector:"Banking",quantity:500,marketValue:25000}
];
const sellReview={available:true,action:"SELL",symbol:"SCOM",transaction:{gross:5000},current:{availableCash:10000},projected:{availableCash:14900,sectorExposurePct:44}};
const goalEvidence={available:true,source:"REAL_WEALTH_JOURNEY",name:"Long Term Wealth",targetAmount:100000,targetDate:"2030-12-31",hasTrajectoryEvidence:true,currency:"KES"};
const sell=buildGoalRiskStressImpact({holdings,projectedImpact:sellReview,goalEvidence,stressLossPercent:20});
assert.equal(sell.available,true);
assert.equal(sell.projectedHoldingsValue,45000);
assert.equal(sell.projectedNetWorth,59900);
assert.equal(sell.stressedHoldingsValue,36000);
assert.equal(sell.stressedNetWorth,50900);
assert.equal(sell.risk.recoveryPercent,25);
assert.equal(sell.safeguards.recoveryMathSource,"M20AQ_DECISION_LAB");
assert.equal(sell.safeguards.cashStressedAsEquity,false);
assert.equal(sell.goal.available,true);
assert.equal(sell.goal.trackStatus,"NOT_RECLASSIFIED_FROM_SINGLE_TRADE");
console.log("PASS — SELL scenario stress preserves cash and reuses M20AQ recovery/risk math.");

const buyReview={available:true,action:"BUY",symbol:"SCOM",transaction:{gross:5000},current:{availableCash:10000},projected:{availableCash:4900,sectorExposurePct:54.55}};
const buy=buildGoalRiskStressImpact({holdings,projectedImpact:buyReview,goalEvidence,stressLossPercent:30});
assert.equal(buy.projectedHoldingsValue,55000);
assert.equal(buy.projectedNetWorth,59900);
assert.equal(buy.risk.recoveryPercent,42.86);
assert.equal(buy.safeguards.expectedReturnInvented,false);
assert.equal(buy.safeguards.probabilityForecastUsed,false);
console.log("PASS — BUY stress is deterministic and does not invent expected return or probability evidence.");

const missingGoal=buildGoalRiskStressImpact({holdings,projectedImpact:buyReview,goalEvidence:{available:false,reason:"NO_ACTIVE_GOAL"},stressLossPercent:10});
assert.equal(missingGoal.goal.available,false);
assert.match(missingGoal.goal.message,/No verified active Wealth Journey goal/i);
assert.equal(missingGoal.available,true);
console.log("PASS — missing goal evidence does not block risk stress and does not fabricate goal progress.");

const extracted=extractVerifiedGoalEvidence({experience:{journey:{topPriorityGoal:{progress:{goal:{id:"G1",name:"Home",targetAmount:200000,targetDate:"2032-01-01",currency:"KES"},trajectory:{valid:true}}}}}});
assert.equal(extracted.available,true);
assert.equal(extracted.name,"Home");
assert.equal(extracted.targetAmount,200000);
assert.equal(extracted.hasTrajectoryEvidence,true);
console.log("PASS — saved goal evidence is extracted from the existing REAL Wealth Journey runtime.");

assert.deepEqual([10,20,30,40,50],sell.recoveryTable.map(x=>x.lossPercent));
assert.deepEqual([11.11,25,42.86,66.67,100],sell.recoveryTable.map(x=>x.recoveryPercent));
assert.equal(sell.mutatesRealPortfolio,false);
assert.equal(sell.mutatesPracticePortfolio,false);
assert.equal(sell.mutatesInvestorDNA,false);
assert.equal(sell.mutatesGoals,false);
console.log("PASS — standard recovery ladder and all no-mutation boundaries remain explicit.");
