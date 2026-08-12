/*
 * PC-028F — GOALS INTEGRATION
 *
 * Replace raw goal cards with investor-centered progress cards.
 *
 * Import:
 *
 * import {
 *   loadWealthJourneyGoalsSummary
 * } from "../src/features/wealth-journey/wealthJourneyExperienceService";
 *
 * import WealthJourneyGoalCard from
 *   "../src/features/wealth-journey/components/WealthJourneyGoalCard";
 *
 * const goalSummary = loadWealthJourneyGoalsSummary(context);
 *
 * {goalSummary.goals.map(goal => (
 *   <WealthJourneyGoalCard
 *     key={goal.id || goal.name}
 *     goal={goal}
 *   />
 * ))}
 */

export const PC_028F_GOALS_PATCH = true;
