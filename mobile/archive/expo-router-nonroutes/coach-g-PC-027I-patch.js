/*
 * PC-027I — COACH G INTEGRATION
 *
 * Import:
 *
 * import {
 *   loadCoachGCorporateActionExperiencePrompt
 * } from "../src/features/corporate-actions/corporateActionExperienceService";
 *
 * import CoachGCorporateActionCard from
 *   "../src/features/corporate-actions/components/CoachGCorporateActionCard";
 *
 * During Coach G context loading:
 *
 * const corporateActionPrompt =
 *   await loadCoachGCorporateActionExperiencePrompt({
 *     holdings,
 *     portfolio,
 *     investorContext: investorDNAContext
 *   });
 *
 * Render:
 *
 * <CoachGCorporateActionCard prompt={corporateActionPrompt} />
 *
 * Also include corporateActionPrompt in the Coach G conversation context
 * so Coach G can naturally discuss the event instead of forcing the
 * investor to visit a separate technical module.
 */

export const PC_027I_COACH_G_PATCH = true;
