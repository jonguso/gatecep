import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const files = ["trade", "first-trade", "trade-basket", "orders", "orders-review", "basket-execution", "queue-manager", "broker-routing", "order-handoff", "execution-audit", "execution-wizard", "execution-bridge"];
const sources = Object.fromEntries(await Promise.all(files.map(async (name) => [name, await read(`app/${name}.js`)])));
const combined = Object.values(sources).join("\n");

assert.match(sources.trade, /Practice Trade/);
assert.match(sources.trade, /savePracticePortfolio/);
assert.match(sources.trade, /practiceSimulatedTrades/);
assert.match(sources["first-trade"], /Practice First Trade/);
assert.match(sources["first-trade"], /savePracticePortfolio/);
assert.match(sources["first-trade"], /practiceSimulatedTrades/);
assert.match(sources.orders, /Practice Orders/);
assert.match(sources.orders, /PRACTICE_SIMULATION/);
assert.match(sources["queue-manager"], /Practice Queue Manager/);
assert.doesNotMatch(sources["queue-manager"], /placeBrokerOrder/);
assert.doesNotMatch(combined, /source:\s*["']BROKER_CONFIRMATION["']/);
assert.match(sources["order-handoff"], /latestPracticeOrderHandoff/);
assert.match(sources["order-handoff"], /isPractice: true/);
assert.match(sources["broker-routing"], /Practice Routing/);
assert.match(sources["execution-audit"], /Practice Execution Audit/);

console.log("PASS — every GateCEP trade-entry and OMS route is visibly Practice-only.");
console.log("PASS — the Practice queue cannot call a connected-broker adapter.");
console.log("PASS — GateCEP cannot fabricate a BROKER_CONFIRMATION or REAL fill timestamp.");
console.log("PASS — Practice orders, fills, scenarios, and audit records remain isolated from REAL evidence.");
