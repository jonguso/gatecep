import assert from "node:assert/strict";
import { buildProjectedImpactReview, buildProjectedImpactInterpretation } from "../src/features/trading/coachGProjectedImpactService.js";

const holdings = [
  { symbol:"SCOM", sector:"Telecom", quantity:1000, averagePrice:20, currentPrice:25, marketValue:25000 },
  { symbol:"KCB", sector:"Banking", quantity:500, averagePrice:40, currentPrice:50, marketValue:25000 }
];

const sell = buildProjectedImpactReview({ holdings, selectedStock:{symbol:"SCOM",sector:"Telecom"}, side:"SELL", estimate:{qty:200,price:25,gross:5000,totalFees:100,remainingCash:14900}, existingHolding:holdings[0], averageGuard:{available:true,remainingQuantity:800,remainingAveragePrice:20.5,releasedCostBasis:3900,estimatedRealizedProfitLoss:1000}, availableCash:10000 });
assert.equal(sell.available,true);
assert.equal(sell.interpretation.action,"SELL");
assert.equal(sell.interpretation.concentrationDirection,"LOWER");
assert.equal(sell.interpretation.liquidityDirection,"HIGHER");
assert.match(sell.interpretation.summary,/lowers Telecom exposure/i);
assert.match(sell.interpretation.summary,/leaving 800 projected shares/i);
assert.doesNotMatch(sell.interpretation.summary,/adding more|accommodate/i);
assert.match(sell.interpretation.question,/released cash/i);
assert.equal(sell.projected.weightedAveragePrice,20.5);
assert.equal(sell.projected.costBasisReleased,3900);
assert.equal(sell.projected.realizedGainLoss,1000);
console.log("PASS — SELL projected impact and Coach G interpretation are action-aware and FIFO-backed.");

const buy = buildProjectedImpactReview({ holdings, selectedStock:{symbol:"SCOM",sector:"Telecom"}, side:"BUY", estimate:{qty:200,price:25,gross:5000,totalFees:100,remainingCash:4900}, existingHolding:holdings[0], averageGuard:{available:true,projectedAveragePrice:21.75}, availableCash:10000 });
assert.equal(buy.interpretation.action,"BUY");
assert.equal(buy.interpretation.concentrationDirection,"HIGHER");
assert.equal(buy.interpretation.liquidityDirection,"LOWER");
assert.match(buy.interpretation.summary,/raises Telecom exposure/i);
assert.match(buy.interpretation.question,/extra concentration/i);
assert.equal(buy.projected.weightedAveragePrice,21.75);
console.log("PASS — BUY projected impact explains concentration and liquidity without using SELL reasoning.");

const unavailable = buildProjectedImpactInterpretation({ available:false, action:"SELL", evidenceMessage:"Verified FIFO evidence required." });
assert.equal(unavailable.available,false);
assert.match(unavailable.summary,/FIFO evidence required/);
console.log("PASS — missing evidence produces an evidence boundary, not fabricated interpretation.");

assert.equal(sell.advisoryOnly,true);
assert.equal(sell.realPortfolioMutationAllowed,false);
assert.equal(sell.practicePortfolioMutationAllowed,false);
assert.match(sell.interpretation.evidenceBoundaries.join(" "),/FIFO-aware SELL analysis/);
console.log("PASS — interpretation remains advisory-only and preserves accounting/evidence boundaries.");
