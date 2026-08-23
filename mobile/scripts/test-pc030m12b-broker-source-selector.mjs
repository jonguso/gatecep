import assert from "node:assert/strict";
import {
  derivePortfolioAccounts,
  mergePortfolioAccounts
} from "../src/features/portfolio-home/portfolioAccountCatalogService.js";

const derived = derivePortfolioAccounts({
  holdings: [
    { broker: "AIB|137971", symbol: "SCOM", marketValue: 1000 },
    { broker: "ABC|7788", symbol: "KCB", marketValue: 2000 },
    { broker: "PRACTICE", symbol: "EABL", marketValue: 5000 }
  ],
  cashBalances: [
    { broker: "AIB|137971", cashBalance: 30985.95 },
    { broker: "ABC|7788", cashBalance: 12000 },
    { broker: "PRACTICE", cashBalance: 9000 }
  ]
});

assert.deepEqual(derived.map((item) => item.broker), ["AIB|137971", "ABC|7788"]);
assert.equal(derived[0].availableCash, 30985.95);
assert.equal(derived[1].availableCash, 12000);

const merged = mergePortfolioAccounts(
  [{ broker: "AIB|137971", label: "AIB Trading 137971", type: "BROKER" }],
  derived
);
assert.equal(merged.length, 2);
assert.equal(merged[0].label, "AIB Trading 137971");
assert.equal(merged[1].broker, "ABC|7788");

console.log("PASS — individual real broker accounts are rebuilt from authoritative holdings and cash.");
console.log("PASS — endpoint labels win while missing accounts use the portfolio fallback.");
console.log("PASS — Practice remains excluded from the REAL portfolio selector.");
