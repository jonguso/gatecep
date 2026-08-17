import {
  loadRealCurrentInvestorWealthJourney
} from "./realWealthJourneyRuntime";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function key(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
}

export async function loadCurrentGoalRecoveryOptions({
  goalId,
  goalName
} = {}) {
  const result = await loadRealCurrentInvestorWealthJourney();
  const advice = safeArray(result?.experience?.journey?.goalAdvice);
  const requestedId = clean(goalId);
  const requestedName = key(goalName);

  const selected =
    advice.find((item) => requestedId && clean(item?.goal?.id) === requestedId) ||
    advice.find((item) => requestedName && key(item?.goal?.name) === requestedName) ||
    result?.experience?.journey?.topPriorityGoal ||
    advice[0] ||
    null;

  const recovery = selected?.recovery || {};
  const scenarios = safeArray(recovery?.scenarios);

  return {
    available: Boolean(recovery?.recoveryNeeded && scenarios.length),
    goal: selected?.goal || selected?.progress?.goal || null,
    progress: selected?.progress || null,
    scenarios,
    recommendedScenarioId: recovery?.recommendedScenarioId || null,
    narrative: recovery?.coachGContext?.narrative || null,
    safeguards: {
      advisoryOnly: true,
      goalChanged: false,
      contributionChanged: false,
      portfolioChanged: false,
      practiceUsed: false,
      ...(recovery?.safeguards || {})
    }
  };
}
