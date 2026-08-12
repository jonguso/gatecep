/*
 * PC-028F — HOME INTEGRATION
 *
 * Home should surface one simple wealth-journey card, not the engines.
 *
 * Import:
 *
 * import {
 *   loadWealthJourneyHomeCard
 * } from "../src/features/wealth-journey/wealthJourneyExperienceService";
 *
 * import WealthJourneyHomeCard from
 *   "../src/features/wealth-journey/components/WealthJourneyHomeCard";
 *
 * During Home loading:
 *
 * const wealthJourneyCard = loadWealthJourneyHomeCard({
 *   goals,
 *   portfolio,
 *   cash,
 *   contributionBehavior,
 *   behavior,
 *   portfolioHealth,
 *   investorDNA,
 *   financialContext,
 *   allocationAdvice,
 *   planningAssumptions,
 *   recentLifeChanges
 * });
 *
 * Render:
 *
 * <WealthJourneyHomeCard card={wealthJourneyCard} />
 */

export const PC_028F_HOME_PATCH = true;
