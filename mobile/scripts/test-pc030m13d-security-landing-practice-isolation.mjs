import assert from "node:assert/strict";
import fs from "node:fs";

const markets = fs.readFileSync("app/(tabs)/markets.js", "utf8");
const security = fs.readFileSync("app/security/[symbol].js", "utf8");
const trade = fs.readFileSync("app/trade.js", "utf8");

assert.doesNotMatch(markets, /MarketDepthModal/);
assert.match(markets, /router\.push\(`\/security\/\$\{row\.symbol\}`\)/);
assert.match(markets, /router\.push\(`\/security\/\$\{stock\.symbol\}`\)/);
assert.match(security, /Back to Markets/);
assert.doesNotMatch(security, />Market depth</);
assert.doesNotMatch(security, /Simulate \/ Place Trade/);
assert.doesNotMatch(security, /\/trade\?symbol=/);

assert.match(trade, /Practice Trade/);
assert.match(trade, /practicePortfolio/);
assert.match(trade, /practiceSimulatedTrades/);
assert.match(trade, /savePracticePortfolio/);
assert.doesNotMatch(trade, /savePortfolio\(/);
assert.doesNotMatch(trade, /userSetItem\("availableCash"/);
assert.doesNotMatch(trade, /userSetItem\("statementUploaded"/);
assert.doesNotMatch(trade, /userSetItem\("brokerReadiness"/);
assert.doesNotMatch(trade, /refreshCanonicalRealPortfolioSnapshot/);
assert.doesNotMatch(trade, /buildSyncStatus/);
assert.doesNotMatch(trade, /defaultBrokerProfile/);

console.log("PASS — Market rows land directly on Security Education.");
console.log("PASS — repeated depth and practice-trade actions are removed from the REAL research journey.");
console.log("PASS — Practice Trade writes only practicePortfolio and practiceSimulatedTrades.");
console.log("PASS — Practice Trade cannot refresh REAL snapshots, readiness, sync, portfolio, or cash keys.");
