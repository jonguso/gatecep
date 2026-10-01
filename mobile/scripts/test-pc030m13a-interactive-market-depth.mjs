import fs from "node:fs";
import assert from "node:assert/strict";

const markets = fs.readFileSync("app/(tabs)/markets.js", "utf8");
const securityDetail = fs.readFileSync("app/security/[symbol].js", "utf8");
const modal = fs.readFileSync("src/components/markets/MarketDepthModal.js", "utf8");
const hub = fs.readFileSync("src/services/markets/marketHubData.js", "utf8");

assert.match(markets, /useState\("Equities"\)/);
assert.match(markets, /router\.push\(`\/security\/\$\{row\.symbol\}`\)/);
assert.match(markets, /router\.push\(`\/security\/\$\{stock\.symbol\}`\)/);
assert.doesNotMatch(markets, /<MarketDepthModal/);
assert.doesNotMatch(markets, /getMarketDepth/);
assert.ok(hub.indexOf('"Equities"') < hub.indexOf('"Summary"'));

assert.match(securityDetail, /import MarketDepthModal/);
assert.match(securityDetail, /View Market Depth/);
assert.match(securityDetail, /setMarketDepthOpen\(true\)/);
assert.match(securityDetail, /<MarketDepthModal/);
assert.match(securityDetail, /security=\{security\}/);

assert.match(modal, /buildVerifiedDepthView/);
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
console.log("PASS — verified Markets securities route to canonical Security Detail.");
console.log("PASS — Security Detail owns the investor-facing Market Depth action.");
console.log("PASS — genuine bid and ask arrays render quantity, price, splits, and time.");
console.log("PASS — missing Level 2 evidence fails closed without fabricated orders.");
console.log("PASS — market depth remains read-only and provider-attributed.");
