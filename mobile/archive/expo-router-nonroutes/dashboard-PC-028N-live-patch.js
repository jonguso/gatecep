/*
 * ============================================================
 * PC-028N
 * LIVE DASHBOARD WIRING
 * ============================================================
 *
 * Add imports to the actual Dashboard screen:
 *
 * import {
 *   usePortfolioSource
 * } from "../src/features/portfolio-source/PortfolioSourceContext";
 *
 * import LivePortfolioSourceSelector from
 *   "../src/features/portfolio-source/components/LivePortfolioSourceSelector";
 *
 * import LivePortfolioSourceStatus from
 *   "../src/features/portfolio-source/components/LivePortfolioSourceStatus";
 *
 * import {
 *   buildVisiblePortfolioMetrics
 * } from "../src/features/portfolio-source/livePortfolioMetrics";
 *
 * Inside Dashboard:
 *
 * const {
 *   selectedPortfolio,
 *   isPracticeSelected,
 *   hasRealSources
 * } = usePortfolioSource();
 *
 * const visiblePortfolio = buildVisiblePortfolioMetrics(
 *   selectedPortfolio || {}
 * );
 *
 * Render near Portfolio / Net Worth:
 *
 * <LivePortfolioSourceSelector compact />
 * <LivePortfolioSourceStatus />
 *
 * The visible portfolio card may use:
 *
 * visiblePortfolio.totalValue
 * visiblePortfolio.availableCash
 * visiblePortfolio.holdingsCount
 *
 * IMPORTANT REAL-WEALTH RULE:
 *
 * If Practice is selected, it is only the visible demo portfolio panel.
 *
 * Existing real:
 *   - Net Worth
 *   - Wealth Journey
 *   - Goal Progress
 *   - Coach G recommendation monitoring
 *
 * must continue to use the real wealth pipeline and MUST NOT switch to
 * Practice values.
 */

export const PC_028N_DASHBOARD_LIVE_PATCH = true;
