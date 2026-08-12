/*
 * PC-024B integration for app/research-valuation.js
 *
 * Add this import:
 *
 * import {
 *   buildFundamentalResearchUniverse
 * } from "../src/features/fundamentals/portfolioFundamentalEnrichmentService";
 *
 * Replace:
 *
 * const securities =
 *   holdings.map((holding) => ({ ...holding, ... }));
 *
 * With:
 *
 * const securities =
 *   await buildFundamentalResearchUniverse({
 *     holdings
 *   });
 *
 * const research =
 *   buildResearchMarketIntelligence({
 *     securities
 *   });
 *
 * This keeps portfolio values authoritative and enriches only
 * research/fundamental fields from the local repository.
 */

export const PC_024B_RESEARCH_DASHBOARD_PATCH = true;
