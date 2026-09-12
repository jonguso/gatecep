import assert from "node:assert/strict";
import {
  requestFloatingCoachGOpen,
  subscribeFloatingCoachGOpen,
  consumePendingFloatingCoachGOpen,
  FLOATING_COACH_G_ACTIVATION_INTEGRITY
} from "../src/features/trading/floatingCoachGActivationService.js";

let received = null;
const unsubscribe = subscribeFloatingCoachGOpen((request) => {
  received = request;
});

requestFloatingCoachGOpen({
  source: "RECOVERY_RECOMMENDATION",
  question: "Would reaching this goal later still meet your purpose?",
  context: { scenarioId: "RECOVERY_TIMELINE_12" }
});

assert.equal(received?.type, "OPEN_FLOATING_COACH_G");
assert.equal(received?.source, "RECOVERY_RECOMMENDATION");
assert.match(received?.question, /later/);
assert.equal(received?.context?.scenarioId, "RECOVERY_TIMELINE_12");
unsubscribe();
console.log("PASS — active Floating Coach receives explicit open request.");

requestFloatingCoachGOpen({
  source: "RECOVERY_RECOMMENDATION",
  question: "Pending question?"
});
const pending = consumePendingFloatingCoachGOpen();
assert.equal(pending?.question, "Pending question?");
assert.equal(consumePendingFloatingCoachGOpen(), null);
console.log("PASS — pending activation can be consumed after mount.");

assert.equal(FLOATING_COACH_G_ACTIVATION_INTEGRITY.mutatesRealPortfolio, false);
assert.equal(FLOATING_COACH_G_ACTIVATION_INTEGRITY.mutatesGoals, false);
assert.equal(FLOATING_COACH_G_ACTIVATION_INTEGRITY.brokerExecutionAllowed, false);
console.log("PASS — activation bridge is UI-only.");
