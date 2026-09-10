import assert from "node:assert/strict";
import {
  startDecisionConversation,
  clearDecisionConversation
} from "../src/features/trading/coachGDecisionConversationSession.js";

clearDecisionConversation();

let s=startDecisionConversation({
  scenario:{security:"EQT",action:"SELL",amount:25000},
  openingText:"You are considering SELL EQT.",
  openingQuestion:"I have enough context to simulate this against your portfolio, goals, liquidity, concentration and Investor DNA."
});
assert.equal(s.phase,"DISCOVERY");
assert.match(s.turns.at(-1).text,/\?$/);
assert.match(s.turns.at(-1).text,/released cash/i);
console.log("PASS — non-question dialogue text cannot replace the SELL discovery question.");

clearDecisionConversation();
s=startDecisionConversation({
  scenario:{security:"SCOM",action:"BUY",amount:30000},
  openingText:"You are considering BUY SCOM.",
  openingQuestion:"Ready to simulate."
});
assert.match(s.turns.at(-1).text,/\?$/);
assert.match(s.turns.at(-1).text,/outcome/i);
console.log("PASS — BUY discovery always starts with an answerable question.");

clearDecisionConversation();
s=startDecisionConversation({
  scenario:{security:"EQT",action:"SELL",amount:25000},
  openingQuestion:"How much liquidity do you want to keep?"
});
assert.equal(s.turns.at(-1).text,"How much liquidity do you want to keep?");
console.log("PASS — a valid existing Coach G question is preserved.");
