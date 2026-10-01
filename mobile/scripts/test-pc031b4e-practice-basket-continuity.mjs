import assert from "node:assert/strict";
import fs from "node:fs";

const coach = fs.readFileSync(
  new URL("../app/coach-insights.js", import.meta.url),
  "utf8"
);

const basketScreen = fs.readFileSync(
  new URL("../app/basket-execution.js", import.meta.url),
  "utf8"
);

const ordersReview = fs.readFileSync(
  new URL("../app/orders-review.js", import.meta.url),
  "utf8"
);

const executionStore = fs.readFileSync(
  new URL(
    "../src/services/trade/basketExecutionStore.js",
    import.meta.url
  ),
  "utf8"
);

const basketStore = fs.readFileSync(
  new URL(
    "../src/services/trade/tradeBasketStore.js",
    import.meta.url
  ),
  "utf8"
);

assert.match(
  coach,
  /saveTradeBasket\([\s\S]*?"COACH_G_SIMULATION"[\s\S]*?executionMode:\s*"PRACTICE"[\s\S]*?brokerId:\s*"GATECEP_PRACTICE"/,
  "Coach G must save an explicit Practice basket"
);

assert.match(
  coach,
  /createBasketExecution\(\{[\s\S]*?forceNew:\s*true[\s\S]*?\}\)/,
  "Coach G must create a fresh execution for the newly saved basket"
);

assert.match(
  coach,
  /if \(!nextExecution\?\.orders\?\.length\)/,
  "Coach G must fail closed if fresh execution contains no orders"
);

assert.match(
  coach,
  /router\.push\("\/basket-execution"\)/,
  "Coach G must route to canonical basket execution review"
);

assert.match(
  basketScreen,
  /return\s*\[\s*"REVIEW",\s*"QUEUED",/,
  "Basket execution must keep REVIEW orders visible"
);

assert.match(
  ordersReview,
  /const queuedOrders = orders\.filter\([\s\S]*?ORDER_STATUS\.QUEUED/,
  "Orders Review must explicitly retain queued orders as a continuation state"
);

assert.match(
  ordersReview,
  /Continue to Order Handoff/,
  "Queued Practice orders must expose a visible continuation action"
);

assert.match(
  ordersReview,
  /router\.push\("\/queue-manager"\)/,
  "Practice post-queue continuation must open the canonical Queue Manager"
);

assert.match(
  ordersReview,
  /if \(isRealExecution\)[\s\S]*?router\.push\("\/\(tabs\)\/trading"\)/,
  "REAL post-queue handoff must remain separate from Practice routing"
);


assert.match(
  basketScreen,
  /execution\?\.orders\?\.length > 0[\s\S]*?activeOrders\.length === 0[\s\S]*?recoveryOrders\.length === 0/,
  "Execution Complete must require a non-empty execution with no active/review/recovery orders"
);

assert.match(
  executionStore,
  /const basket = await loadTradeBasket\(\)/,
  "Execution creation must consume the canonical saved trade basket"
);

assert.match(
  executionStore,
  /executionMode:\s*basket\.executionMode \|\| "PRACTICE"/,
  "Execution must preserve basket execution mode"
);

assert.match(
  executionStore,
  /basket\.brokerId[\s\S]*?"GATECEP_PRACTICE"/,
  "Practice execution must preserve/default Practice broker identity"
);


assert.match(
  executionStore,
  /brokerName:[\s\S]*?item\.brokerName[\s\S]*?"GateCEP Broker"/,
  "Initial Practice REVIEW orders must carry GateCEP Broker display identity"
);

assert.match(
  executionStore,
  /brokerName:[\s\S]*?basket\.brokerName[\s\S]*?"GateCEP Broker"/,
  "Initial Practice execution must carry GateCEP Broker display identity"
);

assert.match(
  basketScreen,
  /Practice Execution Broker/,
  "Practice Basket Simulation must identify its Practice execution broker"
);

assert.match(
  basketScreen,
  /GateCEP Broker — Simulation Only/,
  "Practice broker must be visibly identified as simulation-only"
);

assert.match(
  basketScreen,
  /No connected REAL broker is required/,
  "Practice basket must not imply that a REAL broker connection is required"
);

assert.match(
  basketStore,
  /userSetItem\("activeTradeBasket", JSON\.stringify\(basket\)\)/,
  "Trade basket must remain user-scoped"
);

assert.match(
  executionStore,
  /userSetItem\(ACTIVE_BASKET_EXECUTION_KEY, JSON\.stringify\(execution\)\)/,
  "Basket execution must remain user-scoped"
);

console.log(
  "PASS — Coach G Practice basket creates a fresh execution from the newly saved canonical basket."
);
console.log(
  "PASS — Practice execution preserves PRACTICE mode and GATECEP_PRACTICE broker evidence."
);
console.log(
  "PASS — REVIEW orders remain visible and cannot masquerade as an empty completed execution."
);
console.log(
  "PASS — Practice basket and execution remain user-scoped."
);
console.log(
  "PASS — Practice REVIEW orders and execution carry GateCEP Broker simulation identity without requiring a REAL broker connection."
);
console.log(
  "PASS — queued Practice orders retain a visible continuation path to canonical Queue Manager."
);
console.log(
  "PASS — Practice post-queue navigation no longer dead-ends on Orders Review."
);
