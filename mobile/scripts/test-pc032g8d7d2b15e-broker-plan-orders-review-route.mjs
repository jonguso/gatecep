import assert from "node:assert/strict";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../app/basket-execution.js",
      import.meta.url
    ),
    "utf8"
  );

const feedbackStart =
  source.indexOf(
    "{webOrderReviewInteraction && recommendationFeedback ? ("
  );

const confirmationStart =
  source.indexOf(
    "{webOrderReviewInteraction && recommendationConfirmation ? (",
    feedbackStart
  );

assert.ok(
  feedbackStart >= 0 &&
  confirmationStart > feedbackStart,
  "Broker Plan feedback region must exist"
);

const region =
  source.slice(
    feedbackStart,
    confirmationStart
  );

assert.match(
  region,
  /recommendationFeedback\.title\s*===\s*["']Recommendation Saved["']/,
  "Orders Review continuation must be limited to successful save feedback"
);

assert.match(
  region,
  /Continue to Orders Review/,
  "successful save must expose Orders Review continuation"
);

assert.match(
  region,
  /router\.push\s*\(\s*["']\/orders-review["']\s*\)/,
  "continuation must navigate to canonical Orders Review"
);

assert.match(
  region,
  /setRecommendationFeedback\s*\(\s*null\s*\)/,
  "existing Dismiss behavior must remain"
);

/*
 * This is intentionally navigation-only.
 *
 * The REVIEW orders already exist in canonical Practice OMS.
 * The Broker Plan must not manufacture a second basket or
 * advance execution lifecycle state.
 */
for (const [pattern, message] of [
  [
    /createBasketExecution\s*\(/,
    "must not create another OMS execution"
  ],
  [
    /saveBasketExecution\s*\(/,
    "must not rewrite OMS execution state"
  ],
  [
    /updateExecutionOrder\s*\(/,
    "must not mutate REVIEW orders"
  ],
  [
    /markExecutionOrderFilled\s*\(/,
    "must not settle an order"
  ],
  [
    /runPracticeExecutionOrchestrator\s*\(/,
    "must not start Practice execution"
  ],
  [
    /resumePracticeExecutionOrchestrator\s*\(/,
    "must not resume Practice execution"
  ]
]) {
  assert.doesNotMatch(region, pattern, message);
}

console.log(
  "PASS — successful Broker Plan save exposes Orders Review."
);
console.log(
  "PASS — existing canonical REVIEW orders are reused."
);
console.log(
  "PASS — continuation is navigation-only."
);
console.log(
  "PASS — Dismiss remains available."
);
console.log(
  "PASS — failure/informational feedback does not receive execution continuation."
);
console.log(
  "PASS — B15E Broker Plan → existing Orders Review contract complete."
);
