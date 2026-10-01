import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir =
  path.dirname(fileURLToPath(import.meta.url));

const mobileRoot =
  path.resolve(scriptDir, "..");

function read(relativePath) {
  return fs.readFileSync(
    path.join(mobileRoot, relativePath),
    "utf8"
  );
}

const firstTrade =
  read("app/first-trade.js");

const ordersReview =
  read("app/orders-review.js");

const basketExecution =
  read("app/basket-execution.js");

const tradeHistory =
  read("app/trade-history.js");

const portfolio =
  read(
    "src/features/portfolio-home/PortfolioHomeScreen.js"
  );

const orchestrator =
  read(
    "src/services/trade/practiceExecutionOrchestrator.js"
  );

const accounting =
  read(
    "src/services/trade/practiceExecutionAccountingService.js"
  );

const executionStore =
  read(
    "src/services/trade/basketExecutionStore.js"
  );

/*
 * PC-032G8D7D2B13
 *
 * Practice Investor Journey release contract.
 *
 * This test introduces no execution or accounting authority.
 *
 * It closes the investor-facing Practice lifecycle:
 *
 * First Trade
 *   -> canonical Practice OMS
 *   -> Orders Review
 *   -> Practice funding acceptance
 *   -> GateCEP Broker simulation
 *   -> canonical Practice settlement
 *   -> Practice Portfolio
 *   -> Practice Trade History
 *   -> guarded closed execution lifecycle
 *   -> another Practice First Trade
 *
 * REAL economic state must remain completely outside this path.
 */

/* =========================================================
 * 1. First Trade is Practice OMS order entry only.
 * ========================================================= */

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

assert.doesNotMatch(
  firstTrade,
  /\bsavePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  firstTrade,
  /\bsettlePracticeExecutionOrder\s*\(/
);

console.log(
  "PASS — First Trade remains Practice OMS order entry only."
);

/* =========================================================
 * 2. Active OMS state cannot be overwritten.
 * ========================================================= */

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
  /Active Orders Already Exist/
);

const activeCheck =
  firstTrade.indexOf("loadBasketExecution");

const freshCreate =
  firstTrade.indexOf(
    "createBasketExecution({"
  );

assert.ok(
  activeCheck >= 0 &&
    freshCreate > activeCheck,
  "First Trade must inspect active OMS state before fresh creation"
);

console.log(
  "PASS — active Practice OMS state is protected before another First Trade."
);

/* =========================================================
 * 3. Orders Review owns investor acceptance.
 * ========================================================= */

assert.match(
  ordersReview,
  /preflightCanonicalPracticeExecutionOrders/
);

assert.match(
  ordersReview,
  /queueSingleOrder|queueExecutionOrders/
);

assert.match(
  ordersReview,
  /runPracticeExecutionOrchestrator/
);

assert.match(
  ordersReview,
  /INSUFFICIENT_PRACTICE_CASH/
);

console.log(
  "PASS — Orders Review owns Practice funding acceptance and queue handoff."
);

/* =========================================================
 * 4. Broker simulation remains restartable and Practice-only.
 * ========================================================= */

assert.match(
  orchestrator,
  /PRACTICE_ORCHESTRATOR_REAL_EXECUTION_FORBIDDEN/
);

assert.match(
  orchestrator,
  /routeExecutionOrderByMode/
);

assert.match(
  orchestrator,
  /BROKER_RECEIVED/
);

assert.match(
  orchestrator,
  /markExecutionOrderFilled/
);

assert.match(
  orchestrator,
  /resumePracticeExecutionOrchestrator/
);

console.log(
  "PASS — GateCEP Broker simulation remains restartable and rejects REAL execution."
);

/* =========================================================
 * 5. Canonical accounting owns Practice economics.
 * ========================================================= */

assert.match(
  accounting,
  /settlePracticeExecutionOrder/
);

assert.match(
  accounting,
  /savePracticePortfolio/
);

assert.match(
  accounting,
  /practiceSimulatedTrades/
);

assert.match(
  accounting,
  /executionOrderId/
);

assert.match(
  executionStore,
  /settlePracticeExecutionOrder/
);

console.log(
  "PASS — canonical Practice accounting remains the sole economic settlement path."
);

/* =========================================================
 * 6. Basket Execution is investor-facing OMS presentation.
 * ========================================================= */

assert.match(
  basketExecution,
  /View Practice Portfolio/
);

assert.match(
  basketExecution,
  /View Practice Trade History/
);

assert.match(
  basketExecution,
  /Make Another Practice Trade/
);

assert.match(
  basketExecution,
  /router\.push\("\/first-trade"\)/
);

assert.doesNotMatch(
  basketExecution,
  /\bsavePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  basketExecution,
  /\bsettlePracticeExecutionOrder\s*\(/
);

console.log(
  "PASS — completed Practice execution exposes investor continuation without owning accounting."
);

/* =========================================================
 * 7. Practice Portfolio remains visibly simulated.
 * ========================================================= */

assert.match(
  portfolio,
  /title="Practice Portfolio"/
);

assert.match(
  portfolio,
  /SIMULATED — NO REAL MONEY/
);

console.log(
  "PASS — Practice Portfolio remains explicitly identified as simulated."
);

/* =========================================================
 * 8. Trade History remains an observer/read surface.
 * ========================================================= */

assert.match(
  tradeHistory,
  /Practice Trade Records/
);

assert.match(
  tradeHistory,
  /practiceSimulatedTrades/
);

assert.match(
  tradeHistory,
  /first-trade/
);

assert.doesNotMatch(
  tradeHistory,
  /\bsavePracticePortfolio\s*\(/
);

assert.doesNotMatch(
  tradeHistory,
  /\bsettlePracticeExecutionOrder\s*\(/
);

console.log(
  "PASS — Practice Trade History remains read-only and supports another Practice trade."
);

/* =========================================================
 * 9. REAL economic authority is forbidden throughout
 *    the Practice investor journey.
 * ========================================================= */

const practiceJourneySources = [
  ["First Trade", firstTrade],
  ["Orders Review", ordersReview],
  ["Basket Execution", basketExecution],
  ["Trade History", tradeHistory],
  ["Practice orchestrator", orchestrator],
  ["Practice accounting", accounting]
];

const forbiddenRealAuthority = [
  /\bsaveCanonicalRealPortfolio\s*\(/,
  /\bREAL_BROKER_EXECUTION\b/,
  /\bCONFIRMED_BROKER_EXECUTION\b/,
  /\bverifiedExecutionEvidence\b/,
  /\brealExecutionReconciliation\b/
];

for (
  const [name, source]
  of practiceJourneySources
) {
  for (
    const forbidden
    of forbiddenRealAuthority
  ) {
    assert.doesNotMatch(
      source,
      forbidden,
      `${name} must not acquire REAL economic authority`
    );
  }
}

console.log(
  "PASS — Practice investor journey remains economically isolated from REAL."
);

console.log(
  "PASS — PC-032G8D7D2B13 Practice investor journey release contract complete."
);
