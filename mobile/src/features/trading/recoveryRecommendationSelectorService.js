// PC-030M20AU — Recovery Recommendation Selector
// Converts existing Wealth Journey recovery scenarios into investor-facing selectable cards.
// Read-only/advisory. Never fabricates recovery paths.

const clean = (v) => String(v ?? "").trim();
const upper = (v) => clean(v).toUpperCase();
const arr = (v) => Array.isArray(v) ? v : [];

function goalNameFromAdvice(item = {}) {
  return clean(item?.progress?.goal?.name ?? item?.goal?.name ?? item?.goalName);
}

function recoveryFromAdvice(item = {}) {
  return item?.recovery ?? item?.recoveryPlan ?? null;
}

export function buildRecoveryRecommendationChoices({ wealthJourney = {}, goalName = "" } = {}) {
  const journey = wealthJourney?.experience?.journey ?? wealthJourney?.journey ?? {};
  const goalAdvice = arr(journey?.goalAdvice);
  const requested = upper(goalName);

  const advice =
    goalAdvice.find((item) => requested && upper(goalNameFromAdvice(item)) === requested) ??
    journey?.topPriorityGoal ??
    goalAdvice[0] ??
    null;

  if (!advice) {
    return {
      available: false,
      status: "RECOVERY_EVIDENCE_UNAVAILABLE",
      goalName: clean(goalName) || null,
      choices: [],
      recommendedScenarioId: null,
      message: "No current Wealth Journey recovery recommendation is available for this goal."
    };
  }

  const recovery = recoveryFromAdvice(advice);
  const scenarios = arr(recovery?.scenarios);
  const recommendedScenarioId = clean(recovery?.recommendedScenarioId) || null;

  const choices = scenarios
    .filter((scenario) => scenario && clean(scenario.id))
    .map((scenario) => ({
      id: clean(scenario.id),
      strategy: clean(scenario.strategy) || "REVIEW_FURTHER",
      title: clean(scenario.title) || "Recovery option",
      description: clean(scenario.description) || "Review this recovery option with Coach G.",
      tradeoff: clean(scenario.tradeoff) || null,
      feasibility: clean(scenario.feasibility) || null,
      feasibilityScore: Number.isFinite(Number(scenario.feasibilityScore))
        ? Number(scenario.feasibilityScore)
        : null,
      coachGQuestion: clean(scenario.coachGQuestion) || null,
      recommended: Boolean(recommendedScenarioId && clean(scenario.id) === recommendedScenarioId),
      source: "WEALTH_JOURNEY_RECOVERY"
    }));

  return {
    available: choices.length > 0,
    status: choices.length > 0 ? "RECOVERY_CHOICES_AVAILABLE" : "RECOVERY_CHOICES_EMPTY",
    goalName: goalNameFromAdvice(advice) || clean(goalName) || null,
    choices,
    recommendedScenarioId,
    message: choices.length > 0
      ? "Choose one recovery path to explore, compare them, or create your own what-if."
      : "Coach G has recovery context for this goal, but there are no current evidence-backed recovery scenarios to select."
  };
}

export function buildRecoveryChoiceConversationSeed({ choice, goalName, remainingGoalGap = null } = {}) {
  if (!choice?.id) return { available:false, reason:"RECOVERY_CHOICE_REQUIRED" };

  const gap = Number.isFinite(Number(remainingGoalGap)) ? Number(remainingGoalGap) : null;
  const opening = [
    `You selected "${choice.title}" for ${goalName || "this goal"}.`,
    choice.description,
    choice.tradeoff ? `Trade-off: ${choice.tradeoff}` : "",
    gap !== null ? `The current recovery context shows a remaining goal gap of about KES ${gap.toLocaleString(undefined,{maximumFractionDigits:2})}.` : "",
    "I will help you test this direction before anything is changed."
  ].filter(Boolean).join(" ");

  return {
    available: true,
    scenario: {
      source: "COACH_G_RECOVERY",
      action: "EXPLORE",
      security: null,
      amount: null,
      investorReason: "GOAL_RECOVERY",
      decisionPriority: "GOAL_PROGRESS",
      goalContext: { goalName: goalName || null, remainingGoalGap: gap },
      recommendationContext: {
        scenarioId: choice.id,
        strategy: choice.strategy,
        title: choice.title,
        description: choice.description,
        tradeoff: choice.tradeoff,
        feasibility: choice.feasibility,
        recommended: choice.recommended,
        source: choice.source
      }
    },
    openingText: opening,
    openingQuestion: choice.coachGQuestion || "What part of this recovery path would you like to understand or test first?"
  };
}

export const RECOVERY_RECOMMENDATION_SELECTOR_INTEGRITY = Object.freeze({
  evidenceBackedOnly: true,
  inventsRecoveryPaths: false,
  advisoryOnly: true,
  mutatesRealPortfolio: false,
  mutatesPracticePortfolio: false,
  mutatesInvestorDNA: false,
  mutatesGoals: false,
  brokerExecutionAllowed: false
});


// PC-030M20AU3
// Builds the immediate Coach G response shown after an investor explicitly
// selects a recovery option. This uses only existing scenario evidence.
export function buildSelectedRecoveryCoachResponse({
  choice,
  goalName,
  remainingGoalGap = null
} = {}) {
  if (!choice?.id) {
    return {
      available: false,
      reason: "RECOVERY_CHOICE_REQUIRED",
      answer: null,
      question: null
    };
  }

  const safeGoalName =
    String(goalName || "this goal").trim() || "this goal";

  const gap =
    Number.isFinite(Number(remainingGoalGap))
      ? Math.abs(Number(remainingGoalGap))
      : null;

  const parts = [
    `You selected "${choice.title}" for ${safeGoalName}.`,
    choice.description || null,
    choice.tradeoff
      ? `The trade-off is: ${choice.tradeoff}`
      : null,
    choice.feasibility
      ? `The current recovery evidence classifies this option as ${String(choice.feasibility).toLowerCase()} feasibility.`
      : null,
    gap !== null
      ? `The current recovery context still shows a goal gap of about KES ${gap.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`
      : null
  ].filter(Boolean);

  return {
    available: true,
    answer: parts.join(" "),
    question:
      choice.coachGQuestion ||
      "What part of this selected recovery path would you like to examine before deciding?",
    evidence: {
      scenarioId: choice.id,
      strategy: choice.strategy || null,
      title: choice.title || null,
      description: choice.description || null,
      tradeoff: choice.tradeoff || null,
      feasibility: choice.feasibility || null,
      recommended: Boolean(choice.recommended),
      source: choice.source || "WEALTH_JOURNEY_RECOVERY"
    }
  };
}
