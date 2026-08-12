/*
 * PC-028K addition to PC-028J runtime semantics.
 *
 * For an INTENT_ONLY or PARTIAL goal:
 * - target remains Not set
 * - projected remains Not set
 * - current financial position MAY be shown when actual portfolio data exists
 *
 * This lets Coach G say:
 * "I can see what you have built so far, but I still need to understand
 * what success means for this goal before I can judge whether you are on track."
 */

export function resolveIncompleteGoalCurrentValue({
  goal,
  progress,
  wealthContext
} = {}) {
  const currentFromTrajectory =
    progress
      ?.trajectory
      ?.currentValue;

  if (
    currentFromTrajectory !== null &&
    currentFromTrajectory !== undefined
  ) {
    return Number(
      currentFromTrajectory
    );
  }

  const portfolioValue =
    wealthContext
      ?.context
      ?.portfolio
      ?.currentValue;

  if (
    portfolioValue !== null &&
    portfolioValue !== undefined &&
    Number.isFinite(
      Number(
        portfolioValue
      )
    )
  ) {
    return Number(
      portfolioValue
    );
  }

  return null;
}
