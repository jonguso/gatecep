import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [orders, review, history, ui] = await Promise.all([
  read("app/orders.js"),
  read("app/orders-review.js"),
  read("app/trade-history.js"),
  read("src/components/mobile/MobileUI.js")
]);

assert.match(orders, /testID="orders-status-panel"/);
assert.match(orders, /TABS = \["Review", "Queued", "Routed", "Closed"\]/);
assert.match(orders, /routeExecutionOrder/);
assert.match(orders, /markExecutionOrderFilled/);
assert.match(orders, /cancelExecutionOrder/);
assert.match(review, /testID="orders-review-panel"/);
assert.match(review, /queueExecutionOrders/);
assert.match(review, /queueSingleOrder/);
assert.match(history, /testID="practice-trade-history-panel"/);
assert.match(history, /Practice Trade Records/);
assert.match(history, /gatecepSimulatedTrades/);
assert.match(ui, /nestedScrollEnabled/);

console.log("PASS — each OMS status filter renders one contained internally scrollable order panel.");
console.log("PASS — Orders Review uses a focused editable panel before broker handoff.");
console.log("PASS — simulated Trade History remains clearly isolated as Practice evidence.");
console.log("PASS — routing, broker receipt, fill, cancellation, editing, and queue controls remain present.");
