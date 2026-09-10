export const DECISION_SOURCES = Object.freeze({
  DIRECT: "DIRECT",
  COACH_G_RECOVERY: "COACH_G_RECOVERY",
  WHAT_IF: "WHAT_IF",
  SECURITY_IDEA: "SECURITY_IDEA"
});

export const DECISION_REASONS = Object.freeze([
  "GROWTH", "INCOME", "UNDERVALUED", "REDUCE_CONCENTRATION",
  "TAKE_PROFIT", "REDUCE_RISK", "RAISE_CASH", "FRIEND_OR_MARKET_IDEA", "JUST_EXPLORING", "OTHER"
]);

export const DECISION_PRIORITIES = Object.freeze([
  "CAPITAL_GROWTH", "GOAL_PROGRESS", "INCOME", "LOWER_RISK", "DIVERSIFICATION", "LIQUIDITY"
]);

export function createDecisionScenario(input = {}) {
  return {
    version: "PC-030M20AR",
    source: input.source || DECISION_SOURCES.DIRECT,
    security: String(input.security || "").trim().toUpperCase() || null,
    action: String(input.action || "EXPLORE").trim().toUpperCase(),
    amount: finiteOrNull(input.amount),
    quantity: finiteOrNull(input.quantity),
    price: finiteOrNull(input.price),
    investorReason: input.investorReason || null,
    decisionPriority: input.decisionPriority || null,
    confidence: finiteOrNull(input.confidence),
    notes: String(input.notes || "").trim() || null,
    goalContext: input.goalContext || null,
    recommendationContext: input.recommendationContext || null,
    advisoryOnly: true,
    realPortfolioMutationAllowed: false,
    practicePortfolioMutationAllowed: false
  };
}

export function buildDecisionConversation({ scenario, baseline, investorDNA } = {}) {
  const s = createDecisionScenario(scenario);
  const riskProfile = investorDNA?.riskProfile || investorDNA?.risk || null;
  const security = s.security || "this idea";
  const amountText = s.amount ? `KES ${Number(s.amount).toLocaleString()}` : null;
  const opening = s.source === DECISION_SOURCES.COACH_G_RECOVERY
    ? "You came here from a Coach G recovery recommendation. We can test the recommendation before you decide."
    : s.source === DECISION_SOURCES.SECURITY_IDEA
      ? `You are exploring ${security}. Hearing that a security may do well is a reason to investigate it, not a reason by itself to buy it.`
      : s.source === DECISION_SOURCES.WHAT_IF
        ? `You want to explore what ${amountText || "new money"} could do for your portfolio.`
        : `You are considering ${s.action === "EXPLORE" ? "an investment idea" : s.action} ${security}.`;

  const questions = [];
  if (!s.security && s.source !== DECISION_SOURCES.WHAT_IF) questions.push("Which security are you considering?");
  if (!s.amount && !s.quantity) questions.push("How much are you thinking about investing or changing?");
  if (!s.investorReason) questions.push("Why are you considering this decision?");
  if (!s.decisionPriority) questions.push("What matters most to you in this decision?");

  return {
    opening,
    nextQuestion: questions[0] || "I have enough context to simulate this against your portfolio, goals, liquidity, concentration and Investor DNA.",
    readyToSimulate: questions.length === 0,
    riskProfile,
    holdingsCount: Number(baseline?.holdingsCount || 0),
    availableCash: Number(baseline?.availableCash || 0),
    advisoryOnly: true
  };
}

export function buildAccommodationChoices({ proposedSector, currentSectorWeight, targetSectorWeight } = {}) {
  const current = finiteOrNull(currentSectorWeight);
  const target = finiteOrNull(targetSectorWeight);
  return [
    { id: "ORIGINAL", label: "Keep Original Idea", description: "Test the idea exactly as entered." },
    { id: "ROTATE_WITHIN_SECTOR", label: "Rotate Within Sector", description: proposedSector ? `Explore reducing an existing ${proposedSector} holding to accommodate the new security without materially increasing sector exposure.` : "Explore replacing part of an existing holding in the same sector." },
    { id: "UNDERWEIGHT_SECTOR", label: "Use Underweight Sector", description: "Explore using the capital in an underweight sector to improve diversification." },
    { id: "REDUCE_AMOUNT", label: "Reduce Proposed Amount", description: current !== null && target !== null ? `Explore a smaller amount while keeping sector exposure closer to ${target}%.` : "Explore how much could be added before materially changing portfolio risk." },
    { id: "COMPARE", label: "Compare Options", description: "Compare the original idea with accommodation alternatives before deciding." }
  ];
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
