import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  basketExecution,
  firstTrade,
  accounting,
  tradeHistory,
  portfolioHome
] = await Promise.all([
  read("app/basket-execution.js"),
  read("app/first-trade.js"),
  read("src/services/trade/practiceExecutionAccountingService.js"),
  read("app/trade-history.js"),
  read("src/features/portfolio-home/PortfolioHomeScreen.js")
]);

console.log(
  "===== PC-032G8D7D2B12 — POST-FIRST-TRADE INVESTOR JOURNEY ====="
);

/*
 * 1. Completion remains canonical OMS-derived.
 */
assert.match(
  basketExecution,
  /const isComplete\s*=\s*[\s\S]*?execution\?\.orders\?\.length > 0[\s\S]*?activeOrders\.length === 0[\s\S]*?recoveryOrders\.length === 0/
);

console.log(
  "PASS — completion remains derived from canonical OMS lifecycle state."
);

/*
 * 2. REAL / Practice completion remains distinguishable.
 */
assert.match(
  basketExecution,
  /const isRealExecution/
);

assert.match(
  basketExecution,
  /isRealExecution[\s\S]*?"Open Portfolio"[\s\S]*?"View Practice Portfolio"/
);

assert.match(
  basketExecution,
  /isRealExecution[\s\S]*?"Open Trade History"[\s\S]*?"View Practice Trade History"/
);

console.log(
  "PASS — completed REAL and Practice journeys remain visibly distinct."
);

/*
 * 3. Practice-only continuation exists.
 */
assert.match(
  basketExecution,
  /!isRealExecution\s*\?\s*\([\s\S]*?router\.push\("\/first-trade"\)[\s\S]*?Make Another Practice Trade/
);

console.log(
  "PASS — completed Practice execution offers an explicit next-trade continuation."
);

/*
 * 4. First Trade still protects active canonical OMS state.
 */
assert.match(firstTrade, /loadBasketExecution/);
assert.match(firstTrade, /isActiveOrder/);
assert.match(firstTrade, /Active Orders Already Exist/);
assert.match(firstTrade, /router\.push\("\/orders-review"\)/);

const activeCheck = firstTrade.indexOf("loadBasketExecution");
const createFresh = firstTrade.indexOf("createBasketExecution({");

assert.ok(
  activeCheck >= 0 && createFresh > activeCheck,
  "First Trade must inspect existing OMS state before creating a fresh execution"
);

console.log(
  "PASS — next Practice trade cannot overwrite active OMS state."
);

/*
 * 5. Fresh First Trade remains Practice-only.
 */
assert.match(
  firstTrade,
  /executionMode:\s*"PRACTICE"/
);

assert.match(
  firstTrade,
  /brokerId:\s*"GATECEP_PRACTICE"/
);

console.log(
  "PASS — fresh First Trade remains explicitly Practice execution."
);

/*
 * 6. Completion UI remains observational.
 */
for (const forbidden of [
  /\bsavePracticePortfolio\s*\(/,
  /\bsettlePracticeExecutionOrder\s*\(/,
  /\bmarkExecutionOrderFilled\s*\(/
]) {
  assert.doesNotMatch(
    basketExecution,
    forbidden
  );
}

console.log(
  "PASS — Basket Execution remains presentation/OMS UI, not accounting authority."
);

/*
 * 7. Canonical Practice accounting remains downstream authority.
 */
assert.match(accounting, /savePracticePortfolio/);
assert.match(accounting, /practiceSimulatedTrades/);
assert.match(accounting, /executionOrderId/);

console.log(
  "PASS — canonical Practice accounting still owns economic effects."
);

/*
 * 8. Trade History remains Practice continuation/read surface.
 */
assert.match(
  tradeHistory,
  /Practice Trade Records/
);

assert.match(
  tradeHistory,
  /router\.push\("\/first-trade"\)/
);

assert.doesNotMatch(
  tradeHistory,
  /\bsavePracticePortfolio\s*\(/
);

console.log(
  "PASS — Practice Trade History remains read-only and supports next-trade navigation."
);

/*
 * 9. Portfolio retains explicit Practice identity.
 */
assert.match(
  portfolioHome,
  /title="Practice Portfolio"/
);

assert.match(
  portfolioHome,
  /SIMULATED — NO REAL MONEY/
);

console.log(
  "PASS — Practice Portfolio remains explicitly isolated from REAL."
);

/*
 * 10. REAL mutation authority must not enter First Trade or
 *     Practice accounting through this journey enhancement.
 */
for (const forbidden of [
  /saveCanonicalRealPortfolio/,
  /saveCanonicalRealAvailableCash/,
  /REAL_BROKER_EXECUTION/,
  /CONFIRMED_BROKER_EXECUTION/
]) {
  assert.doesNotMatch(firstTrade, forbidden);
  assert.doesNotMatch(accounting, forbidden);
}

console.log(
  "PASS — post-trade Practice continuation remains economically isolated from REAL."
);

console.log(
  "PASS — PC-032G8D7D2B12 post-first-trade investor journey contract complete."
);
