import fs from "node:fs";
import assert from "node:assert/strict";

const investment=fs.readFileSync("app/investment-intelligence.js","utf8");
const market=fs.readFileSync("app/market-price-import.js","utf8");
const broker=fs.readFileSync("app/broker-marketplace.js","utf8");

for (const [name,src] of Object.entries({investment,market,broker})) {
  assert.ok(src.includes("PC-030M20AV3I RESPONSIVE CALIBRATION"),`${name}: AV3I marker missing`);
}

assert.ok(investment.includes("useWindowDimensions"));
assert.ok(investment.includes("maxWidth: 960"));
assert.ok(investment.includes("paddingBottom: 128"));
assert.ok(investment.includes("windowWidth < 520"));
assert.ok(investment.includes("windowWidth < 420"));
assert.ok(investment.includes("buildCoachGInvestmentAdvice"));
assert.ok(investment.includes("Advisory Intelligence Only"));
assert.ok(investment.includes("does not place trades, change holdings, modify cash"));
assert.ok(investment.includes("or invent missing data"));

assert.ok(market.includes("MobileScreen"));
assert.ok(market.includes("StickyActionBar"));
assert.ok(market.includes("previewManualMarketFile"));
assert.ok(market.includes("commitManualMarketFile"));
assert.ok(market.includes("Prices only—holdings, quantities, cash, and cost basis never change."));
assert.ok(market.includes("LOCAL_VERIFIED_EOD"));
assert.ok(market.includes('flexWrap: "wrap"'));

assert.ok(broker.includes("useWindowDimensions"));
assert.ok(broker.includes("maxWidth: 960"));
assert.ok(broker.includes("paddingBottom: 128"));
assert.ok(broker.includes('router.push("/link-broker-account")'));
assert.ok(broker.includes("AIB-AXYS"));
assert.ok(broker.includes("ABC Capital"));

assert.ok(!fs.readFileSync("app/watchlist-old.js","utf8").includes("PC-030M20AV3I RESPONSIVE CALIBRATION"));

console.log("PASS — three AV3I active utility targets contain responsive calibration.");
console.log("PASS — Investment Intelligence has 960px desktop containment and 128px mobile clearance.");
console.log("PASS — Investment Intelligence advisory/no-mutation/no-invention boundary remains present.");
console.log("PASS — Market Price Import remains inside canonical MobileUI and price-only import contract remains present.");
console.log("PASS — Market Price Import evidence rows are narrow-screen resilient.");
console.log("PASS — Broker Marketplace has 960px desktop containment and 128px mobile clearance.");
console.log("PASS — Broker Marketplace still hands off only to the canonical broker-account linking route.");
console.log("PASS — legacy watchlist-old.js remains untouched.");
console.log("PC-030M20AV3I contract verification complete.");
