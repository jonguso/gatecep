/*
 * PC-027I — HOME INTEGRATION
 *
 * Goal:
 * Do not add another technical menu to Home.
 * Surface only corporate actions that matter to this investor.
 *
 * Import:
 *
 * import {
 *   loadInvestorCorporateActionHomeCard
 * } from "../src/features/corporate-actions/corporateActionExperienceService";
 *
 * Suggested state:
 *
 * const [corporateActionCard, setCorporateActionCard] = useState(null);
 *
 * During Home data loading, call:
 *
 * const card = await loadInvestorCorporateActionHomeCard({
 *   holdings,
 *   portfolio,
 *   investorContext: investorDNAContext
 * });
 *
 * setCorporateActionCard(card);
 *
 * Then render only when visible:
 *
 * {corporateActionCard?.visible ? (
 *   <Pressable
 *     onPress={() => router.push("/corporate-actions")}
 *   >
 *     <Text>{corporateActionCard.title}</Text>
 *     <Text>{corporateActionCard.message}</Text>
 *     <Text>{corporateActionCard.actionLabel}</Text>
 *   </Pressable>
 * ) : null}
 *
 * The important design rule:
 * Home shows the investor meaning and next action, not the engine output.
 */

export const PC_027I_HOME_PATCH = true;
