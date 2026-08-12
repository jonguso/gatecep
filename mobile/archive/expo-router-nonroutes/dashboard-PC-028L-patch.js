/*
 * PC-028L — DASHBOARD SOURCE SELECTOR PATCH GUIDE
 *
 * Dashboard and Portfolio Hub should use the same source policy.
 *
 * Default:
 *   If real accounts exist -> ALL
 *   If no real account exists -> PRACTICE
 *
 * ALL excludes Practice.
 *
 * Practice may be manually selected for familiarization, but:
 * - does not change real net worth
 * - does not change real goal progress
 * - does not enter DNA reconciliation
 * - does not enter recommendation-compliance tracking
 *
 * Suggested imports:
 *
 * import {
 *   buildCanonicalPortfolioView,
 *   buildDashboardPortfolioSourceLabel
 * } from "../src/features/portfolio-source/canonicalPortfolioViewService";
 */

export const PC_028L_DASHBOARD_PATCH = true;
