/*
 * PC-027I — PORTFOLIO INTEGRATION
 *
 * Import:
 *
 * import {
 *   loadInvestorCorporateActionPortfolioCard
 * } from "../src/features/corporate-actions/corporateActionExperienceService";
 *
 * import PortfolioCorporateActionCard from
 *   "../src/features/corporate-actions/components/PortfolioCorporateActionCard";
 *
 * During portfolio loading:
 *
 * const corporateActions =
 *   await loadInvestorCorporateActionPortfolioCard({
 *     holdings,
 *     portfolio,
 *     investorContext: investorDNAContext
 *   });
 *
 * Render near the portfolio summary / income section:
 *
 * <PortfolioCorporateActionCard card={corporateActions} />
 *
 * This card summarizes:
 * - expected income
 * - investor decisions
 * - share changes
 *
 * It does not expose internal engines.
 */

export const PC_027I_PORTFOLIO_PATCH = true;
