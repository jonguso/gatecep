import assert from "node:assert/strict";
import {
  requestFloatingCoachGOpen,
  subscribeFloatingCoachGOpen,
  consumePendingFloatingCoachGOpen
} from "../src/features/trading/floatingCoachGActivationService.js";

let received = null;
const off = subscribeFloatingCoachGOpen((request) => {
  received = request;
});

requestFloatingCoachGOpen({
  source: "RECOVERY_RECOMMENDATION",
  question: "Can we discuss this option?"
});

assert.equal(received?.type, "OPEN_FLOATING_COACH_G");
assert.match(received?.question, /discuss/);
off();

requestFloatingCoachGOpen({ question: "Pending?" });
assert.equal(consumePendingFloatingCoachGOpen()?.question, "Pending?");
assert.equal(consumePendingFloatingCoachGOpen(), null);

console.log("PASS — canonical Floating Coach activation bridge works.");
