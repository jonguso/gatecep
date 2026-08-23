import assert from "node:assert/strict";
import {
  buildPortfolioSourceCatalog
} from "../src/features/portfolio-source/portfolioSourcePolicy.js";
import {
  compareVerifiedBrokerCharges
} from "../src/services/brokers/brokerFeeAdviceService.js";

const catalog = buildPortfolioSourceCatalog({
  realSources: [
    { id: "AIB|137971", type: "BROKER", holdings: [{ symbol: "SCOM", quantity: 1, marketValue: 30 }], availableCash: 30985.95 },
    { id: "ABC|7788", type: "BROKER", holdings: [], availableCash: 12000 }
  ],
  practicePortfolio: { holdings: [], availableCash: 5000 }
});

assert.equal(catalog.realSources[0].availableCash, 30985.95);
assert.equal(catalog.realSources[1].availableCash, 12000);
assert.equal(catalog.allAccounts.availableCash, 42985.95);
assert.equal(catalog.allAccounts.excludedPracticeSourceCount, 1);

const unavailable = compareVerifiedBrokerCharges({
  accounts: [{ id: "A", brokerId: "AIB", brokerName: "AIB" }],
  order: { quantity: 100, price: 20 }
});
assert.equal(unavailable.available, false);

const advice = compareVerifiedBrokerCharges({
  accounts: [
    { id: "A", brokerId: "AIB", brokerName: "AIB", feeSchedule: { verified: true, source: "BROKER_TARIFF", verifiedAt: "2026-08-23", commissionRatePct: 1.5 } },
    { id: "B", brokerId: "ABC", brokerName: "ABC", feeSchedule: { verified: true, source: "BROKER_TARIFF", verifiedAt: "2026-08-23", commissionRatePct: 1.2 } }
  ],
  order: { quantity: 100, price: 20 }
});
assert.equal(advice.available, true);
assert.equal(advice.recommended.brokerId, "ABC");

console.log("PASS — broker cash remains account-scoped and All Accounts excludes Practice.");
console.log("PASS — Coach G compares only verified broker fee schedules.");
