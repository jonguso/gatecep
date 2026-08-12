/*
 * PC-028F — COACH G INTEGRATION
 *
 * Import:
 *
 * import {
 *   loadWealthJourneyCoachGPrompt
 * } from "../src/features/wealth-journey/wealthJourneyExperienceService";
 *
 * import CoachGWealthJourneyCard from
 *   "../src/features/wealth-journey/components/CoachGWealthJourneyCard";
 *
 * Add the prompt to the Coach G context so the conversation naturally
 * starts from the investor's most important goal issue.
 *
 * const prompt = loadWealthJourneyCoachGPrompt({
 *   goals,
 *   portfolio,
 *   cash,
 *   contributionBehavior,
 *   behavior,
 *   portfolioHealth,
 *   investorDNA,
 *   financialContext
 * });
 *
 * <CoachGWealthJourneyCard prompt={prompt} />
 */

export const PC_028F_COACH_G_PATCH = true;
