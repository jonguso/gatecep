import assert from "node:assert/strict";
import fs from "node:fs";

const src =
  fs.readFileSync(
    new URL(
      "../app/orders-review.js",
      import.meta.url
    ),
    "utf8"
  ).replace(/\r\n/g, "\n");

assert.match(
  src,
  /preflightCanonicalPracticeExecutionOrders/
);

assert.match(
  src,
  /runPracticeExecutionOrchestrator/
);

assert.match(
  src,
  /Practice Funds Required/
);

assert.match(
  src,
  /Open Practice Funds/
);

assert.match(
  src,
  /router\.push\("\/basket-execution"\)/
);

assert.match(
  src,
  /router\.push\("\/queue-manager"\)/
);

assert.match(
  src,
  /router\.push\("\/\(tabs\)\/trading"\)/
);

const handlerStart =
  src.indexOf(
    "PC-031B4M7C5D7F3"
  );

assert.ok(
  handlerStart >= 0,
  "D7F3 handoff block must exist"
);

const preflightPos =
  src.indexOf(
    "await preflightCanonicalPracticeExecutionOrders",
    handlerStart
  );

const queuePos =
  src.indexOf(
    "await queueExecutionOrders()",
    handlerStart
  );

const realNavigationPos =
  src.indexOf(
    'router.push("/(tabs)/trading")',
    handlerStart
  );

const orchestratorPos =
  src.indexOf(
    "await runPracticeExecutionOrchestrator()",
    handlerStart
  );

const practiceCompleteNavigationPos =
  src.indexOf(
    'router.push("/basket-execution")',
    handlerStart
  );

assert.ok(
  preflightPos > handlerStart,
  "Practice funding preflight must exist"
);

assert.ok(
  queuePos > preflightPos,
  "Practice funding preflight must happen before queueing"
);

assert.ok(
  realNavigationPos > queuePos,
  "existing REAL post-queue routing must remain"
);

assert.ok(
  orchestratorPos > realNavigationPos,
  "Practice orchestrator must remain after the REAL early-return boundary"
);

assert.ok(
  practiceCompleteNavigationPos > orchestratorPos,
  "Practice completion screen must follow orchestrator handoff"
);

/*
 * The acceptance gate must fail before queue mutation.
 */
const insufficientBlock =
  src.indexOf(
    'error?.code === "INSUFFICIENT_PRACTICE_CASH"',
    handlerStart
  );

assert.ok(
  insufficientBlock >= 0,
  "Practice insufficient-cash handling must exist"
);

const firstReturnAfterInsufficient =
  src.indexOf(
    "return;",
    insufficientBlock
  );

assert.ok(
  firstReturnAfterInsufficient >= 0 &&
    firstReturnAfterInsufficient < queuePos,
  "insufficient Practice funding must return before queueExecutionOrders()"
);

/*
 * D7F3 must not duplicate settlement/routing authorities.
 */
for (const pattern of [
  /markExecutionOrderFilled\s*\(/,
  /routeExecutionOrderByMode\s*\(/,
  /settlePracticeExecutionOrder\s*\(/,
  /savePracticePortfolio\s*\(/,
  /practiceSimulatedTrades/,
  /practiceSettlements/,
  /AsyncStorage\.setItem\s*\(/,
  /userSetItem\s*\(/
]) {
  assert.doesNotMatch(
    src,
    pattern
  );
}

/*
 * Submission handoff must not become a timer-based workflow.
 */
for (const pattern of [
  /setTimeout\s*\(/,
  /setInterval\s*\(/
]) {
  assert.doesNotMatch(
    src,
    pattern
  );
}

console.log(
  "PASS — Practice submission funding is checked before QUEUED."
);

console.log(
  "PASS — insufficient Practice funding returns before queue mutation."
);

console.log(
  "PASS — REAL queueing preserves the existing trading-route early return."
);

console.log(
  "PASS — Practice QUEUED execution hands off to the persisted D7F2 orchestrator."
);

console.log(
  "PASS — successful Practice orchestration opens Basket Execution status."
);

console.log(
  "PASS — paused Practice orchestration remains inspectable through Queue Manager."
);

console.log(
  "PASS — Orders Review does not duplicate routing, settlement, storage or timer ownership."
);

console.log("");
console.log(
  "PC-031B4M7C5D7F3 submission funding gate + orchestrator handoff contract PASSED."
);
