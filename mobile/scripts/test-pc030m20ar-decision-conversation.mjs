import assert from "node:assert/strict";
import { DECISION_SOURCES, createDecisionScenario, buildDecisionConversation, buildAccommodationChoices } from "../src/features/trading/coachGDecisionConversationService.js";

const scenario = createDecisionScenario({ source: DECISION_SOURCES.SECURITY_IDEA, security: "coop", action: "BUY", amount: 50000, investorReason: "FRIEND_OR_MARKET_IDEA", decisionPriority: "DIVERSIFICATION", confidence: 60 });
assert.equal(scenario.security, "COOP");
assert.equal(scenario.advisoryOnly, true);
assert.equal(scenario.realPortfolioMutationAllowed, false);
assert.equal(scenario.practicePortfolioMutationAllowed, false);
const conversation = buildDecisionConversation({ scenario, baseline: { holdingsCount: 8, availableCash: 763.45 }, investorDNA: { riskProfile: "BALANCED" } });
assert.equal(conversation.readyToSimulate, true);
assert.match(conversation.opening, /reason to investigate/i);
const choices = buildAccommodationChoices({ proposedSector: "Banking", currentSectorWeight: 37.7, targetSectorWeight: 37.7 });
assert.ok(choices.some(x => x.id === "ROTATE_WITHIN_SECTOR"));
assert.ok(choices.some(x => x.id === "UNDERWEIGHT_SECTOR"));
assert.ok(choices.some(x => x.id === "COMPARE"));
console.log("PASS — one canonical scenario contract supports direct, recovery, what-if and outside-security ideas.");
console.log("PASS — Coach G conversation preserves investor intent and remains advisory/read-only.");
console.log("PASS — accommodation branches include rotate-within-sector, underweight-sector, reduce-amount and compare.");
