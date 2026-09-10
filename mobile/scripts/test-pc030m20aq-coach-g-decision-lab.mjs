import assert from "node:assert/strict";
import { requiredRecoveryPercent, buildRecoveryStressTable, buildDecisionLabBaseline, classifyDecisionRisk, projectSimpleDecision } from "../src/features/trading/coachGDecisionLabService.js";

console.log("PC-030M20AQ — Coach G Decision Lab");
assert.equal(requiredRecoveryPercent(10), 11.11);
assert.equal(requiredRecoveryPercent(20), 25);
assert.equal(requiredRecoveryPercent(30), 42.86);
assert.equal(requiredRecoveryPercent(40), 66.67);
assert.equal(requiredRecoveryPercent(50), 100);
assert.equal(buildRecoveryStressTable().length, 5);
console.log("PASS — recovery math explains what downside means: 10%→11.11%, 20%→25%, 30%→42.86%, 40%→66.67%, 50%→100% required recovery.");

const baseline = buildDecisionLabBaseline({ holdings: [{symbol:"EQT", quantity:1750, marketPrice:100},{symbol:"SCOM", quantity:1000, marketPrice:30}], availableCash:25000 });
assert.equal(baseline.readOnly, true);
assert.equal(baseline.mutatesRealPortfolio, false);
assert.equal(baseline.holdingsCount, 2);
console.log("PASS — Decision Lab baseline is derived from portfolio evidence and remains read-only.");

const aggressive = classifyDecisionRisk({ projectedLargestHoldingWeight:32, projectedSectorWeight:48, cashPercent:3, stressLossPercent:30, goalImpact:"WORSENS" });
assert.equal(aggressive.classification, "AGGRESSIVE");
assert.ok(aggressive.reasons.length >= 4);
console.log("PASS — AGGRESSIVE is an explainable result of concentration, liquidity, downside and goal evidence, not an arbitrary label.");

const conservative = classifyDecisionRisk({ projectedLargestHoldingWeight:10, projectedSectorWeight:20, cashPercent:20, stressLossPercent:10, goalImpact:"IMPROVES" });
assert.equal(conservative.classification, "CONSERVATIVE");
console.log("PASS — lower concentration/liquidity/downside pressure remains Conservative when evidence supports it.");

const scenario = projectSimpleDecision({ holdings:[{symbol:"EQT", quantity:1750, marketPrice:100}], availableCash:25000, symbol:"EQT", side:"SELL", quantity:100, price:102, charges:100 });
assert.equal(scenario.projectedQuantity, 1650);
assert.equal(scenario.projectedAvailableCash, 35100);
assert.equal(scenario.mutatesRealPortfolio, false);
console.log("PASS — hypothetical decisions project portfolio/cash impact without mutating REAL or Practice evidence.");
