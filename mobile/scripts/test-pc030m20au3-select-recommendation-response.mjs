import assert from "node:assert/strict";
import {
  buildSelectedRecoveryCoachResponse
} from "../src/features/trading/recoveryRecommendationSelectorService.js";

const option = {
  id: "RECOVERY_TIMELINE_12",
  strategy: "EXTEND_TIMELINE",
  title: "Extend the goal timeline by 12 months",
  description:
    "Move the target date from 2027-03-31 to 2028-03-31.",
  tradeoff:
    "This reduces the required monthly contribution, but it delays when the investor reaches the goal.",
  feasibility: "HIGH",
  coachGQuestion:
    "Would reaching the goal 12 months later still meet the purpose of Family Security?",
  recommended: false,
  source: "WEALTH_JOURNEY_RECOVERY"
};

const response = buildSelectedRecoveryCoachResponse({
  choice: option,
  goalName: "Family Security",
  remainingGoalGap: 52237.23
});

assert.equal(response.available, true);
assert.match(response.answer, /Extend the goal timeline by 12 months/);
assert.match(response.answer, /2028-03-31/);
assert.match(response.answer, /trade-off/i);
assert.match(response.answer, /high feasibility/i);
assert.match(response.answer, /52,237.23/);
assert.equal(response.question, option.coachGQuestion);
assert.equal(response.evidence.strategy, "EXTEND_TIMELINE");
console.log("PASS — selected option produces an evidence-backed Coach G response.");

const noChoice = buildSelectedRecoveryCoachResponse({});
assert.equal(noChoice.available, false);
assert.equal(noChoice.reason, "RECOVERY_CHOICE_REQUIRED");
console.log("PASS — Coach G cannot answer a recovery option that was not selected.");

const sparse = buildSelectedRecoveryCoachResponse({
  choice: {
    id: "RECOVERY_SPARSE",
    title: "Review the target amount",
    source: "WEALTH_JOURNEY_RECOVERY"
  },
  goalName: "Family Security"
});
assert.equal(sparse.available, true);
assert.match(sparse.question, /\?$/);
assert.doesNotMatch(sparse.answer, /undefined|null/i);
console.log("PASS — missing optional evidence is omitted rather than fabricated.");
