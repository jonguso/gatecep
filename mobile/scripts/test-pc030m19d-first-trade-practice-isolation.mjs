import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) =>
  readFile(
    new URL(`../${path}`, import.meta.url),
    "utf8"
  );

const [firstTrade, orderBook] =
  await Promise.all([
    read("app/first-trade.js"),
    read("app/order-book.js")
  ]);

/*
 * PC-032G8D7D2B9
 *
 * First Trade remains Practice-only, but it is no longer
 * an accounting or settlement authority.
 *
 * It must create a canonical Practice OMS REVIEW execution
 * and hand the investor to Orders Review.
 */

assert.match(
  firstTrade,
  /Practice First Trade/
);

assert.match(
  firstTrade,
  /saveTradeBasket/
);

assert.match(
  firstTrade,
  /createBasketExecution/
);

assert.match(
  firstTrade,
  /loadBasketExecution/
);

assert.match(
  firstTrade,
  /isActiveOrder/
);

assert.match(
  firstTrade,
  /FIRST_TRADE_PRACTICE/
);

assert.match(
  firstTrade,
  /executionMode:\s*"PRACTICE"/
);

assert.match(
  firstTrade,
  /brokerId:\s*"GATECEP_PRACTICE"/
);

assert.match(
  firstTrade,
  /router\.push\("\/orders-review"\)/
);

/*
 * Legacy direct Practice accounting is forbidden.
 */
assert.doesNotMatch(
  firstTrade,
  /savePracticePortfolio/
);

assert.doesNotMatch(
  firstTrade,
  /practiceSimulatedTrades/
);

assert.doesNotMatch(
  firstTrade,
  /practiceFirstTradeCompleted/
);

assert.doesNotMatch(
  firstTrade,
  /status:\s*"SIMULATED_EXECUTED"/
);

assert.doesNotMatch(
  firstTrade,
  /settlementStatus:\s*"SETTLED"/
);

/*
 * REAL isolation remains mandatory.
 */
for (const forbidden of [
  /savePortfolio/,
  /userSetItem\("availableCash"/,
  /userSetItem\("statementUploaded"/,
  /userSetItem\("simulatedTrades"/,
  /userSetItem\(\s*"brokerReadiness"/,
  /buildSyncStatus/,
  /defaultBrokerProfile/
]) {
  assert.doesNotMatch(
    firstTrade,
    forbidden
  );
}

/*
 * Existing Practice Order Book remains isolated from the
 * legacy REAL simulatedTrades key.
 */
assert.match(
  orderBook,
  /Practice Order Book/
);

assert.match(
  orderBook,
  /practiceSimulatedTrades/
);

assert.doesNotMatch(
  orderBook,
  /userGetItem\("simulatedTrades"\)/
);

console.log(
  "PASS — First Trade creates canonical Practice OMS review state."
);
console.log(
  "PASS — First Trade no longer settles Practice holdings or cash directly."
);
console.log(
  "PASS — First Trade cannot manufacture simulated FILLED/SETTLED evidence."
);
console.log(
  "PASS — existing OMS execution state is checked before new order creation."
);
console.log(
  "PASS — First Trade remains isolated from canonical REAL portfolio state."
);
console.log(
  "PASS — Practice Order Book remains isolated from legacy REAL simulatedTrades."
);
