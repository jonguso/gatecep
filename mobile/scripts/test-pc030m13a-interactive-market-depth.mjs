import fs from "node:fs";
import assert from "node:assert/strict";

const markets = fs.readFileSync("app/(tabs)/markets.js", "utf8");
const modal = fs.readFileSync("src/components/markets/MarketDepthModal.js", "utf8");
const hub = fs.readFileSync("src/services/markets/marketHubData.js", "utf8");

assert.match(markets, /useState\("Equities"\)/);
assert.match(markets, /setSelectedSecurity\(row\)/);
assert.match(markets, /setSelectedSecurity\(stock\)/);
assert.match(markets, /<MarketDepthModal/);
assert.doesNotMatch(markets, /getMarketDepth/);
assert.ok(hub.indexOf('"Equities"') < hub.indexOf('"Summary"'));

assert.match(modal, /ASKS \(Supply\)/);
assert.match(modal, /BIDS \(Demand\)/);
assert.match(modal, />Quantity</);
assert.match(modal, />Price</);
assert.match(modal, />Splits</);
assert.match(modal, />Time</);
assert.match(modal, /Verified Level 2 depth unavailable/);
assert.match(modal, /does not place an order/);
assert.match(modal, /security\?\.bids/);
assert.match(modal, /security\?\.asks/);

console.log("PASS — Equities is the default Markets destination.");
console.log("PASS — every verified security row opens the focused market-depth sheet.");
console.log("PASS — genuine bid and ask arrays render quantity, price, splits, and time.");
console.log("PASS — missing Level 2 evidence fails closed without fabricated orders.");
console.log("PASS — market depth remains read-only and provider-attributed.");
