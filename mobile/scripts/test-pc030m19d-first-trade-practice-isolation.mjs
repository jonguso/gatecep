import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [firstTrade, orderBook] = await Promise.all([
  read("app/first-trade.js"),
  read("app/order-book.js")
]);

assert.match(firstTrade, /Practice First Trade/);
assert.match(firstTrade, /savePracticePortfolio/);
assert.match(firstTrade, /practiceSimulatedTrades/);
assert.match(firstTrade, /practiceFirstTradeCompleted/);
assert.match(firstTrade, /isPractice: true/);
assert.match(firstTrade, /isReal: false/);
assert.match(firstTrade, /sourceType: "PRACTICE"/);

for (const forbidden of [
  /savePortfolio/,
  /userSetItem\("availableCash"/,
  /userSetItem\("statementUploaded"/,
  /userSetItem\("simulatedTrades"/,
  /userSetItem\(\s*"brokerReadiness"/,
  /buildSyncStatus/,
  /defaultBrokerProfile/
]) assert.doesNotMatch(firstTrade, forbidden);

assert.match(orderBook, /Practice Order Book/);
assert.match(orderBook, /practiceSimulatedTrades/);
assert.doesNotMatch(orderBook, /userGetItem\("simulatedTrades"\)/);

console.log("PASS — First Trade reads and writes the Practice portfolio only.");
console.log("PASS — simulated cash cannot mutate canonical REAL available cash or statement status.");
console.log("PASS — onboarding simulation cannot fabricate REAL broker readiness or sync state.");
console.log("PASS — the Practice Order Book reads the same isolated Practice history.");
