import fs from "node:fs";

const reviewPath = new URL(
  "../app/orders-review.js",
  import.meta.url
);

const continuityPath = new URL(
  "./test-pc031b4e-practice-basket-continuity.mjs",
  import.meta.url
);

const review = fs.readFileSync(reviewPath, "utf8");
const continuity = fs.readFileSync(continuityPath, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }

  console.log(`PASS: ${message}`);
}

/*
 * PC-032G8D7D2B15G
 *
 * Regression-contract alignment only.
 *
 * B15F intentionally changed the investor-facing continuation
 * label from "Continue to Practice Execution" to
 * "Continue to Order Handoff".
 *
 * Canonical OMS ownership is unchanged:
 *
 * REVIEW --Prepare This Order--> QUEUED
 * QUEUED --handoff--> Practice orchestrator
 *
 * The handoff count represents persisted QUEUED orders, not
 * the number of editable REVIEW orders.
 */

assert(
  continuity.includes("Continue to Order Handoff"),
  "legacy Practice basket continuity test expects the new handoff wording"
);

assert(
  !continuity.includes("Continue to Practice Execution"),
  "legacy Practice basket continuity test no longer requires stale execution wording"
);

assert(
  /const\s+queuedOrders\s*=\s*orders\.filter\([\s\S]*?ORDER_STATUS\.QUEUED/.test(
    review
  ),
  "orders review still derives handoff selection from canonical QUEUED state"
);

assert(
  review.includes("queueSingleOrder(order.id)"),
  "Prepare This Order still uses canonical single-order queue authority"
);

assert(
  review.includes("runPracticeExecutionOrchestrator()"),
  "Practice continuation still delegates execution progression to the canonical orchestrator"
);

assert(
  review.includes("Continue to Order Handoff"),
  "investor-facing queued continuation uses Order Handoff wording"
);

assert(
  /queuedOrders\.length/.test(review),
  "queued order count remains available to the handoff contract"
);

console.log(
  "\nPC-032G8D7D2B15G PRACTICE BASKET CONTINUITY ALIGNMENT PASS"
);
