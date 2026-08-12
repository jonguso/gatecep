/*
 * ============================================================
 * PC-028N
 * LIVE PORTFOLIO HUB WIRING
 * ============================================================
 *
 * The real app/portfolio-hub.js already loads both Practice and
 * loadUnifiedPortfolio(). PC-028N replaces that independent source
 * selection with shared canonical source state.
 *
 * Add imports:
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
 * Inside PortfolioHub:
 *
 * const {
 *   selectedPortfolio,
 *   selectedSourceId,
 *   loading: portfolioSourceLoading,
 *   refresh: refreshPortfolioSources
 * } = usePortfolioSource();
 *
 * const visible = buildVisiblePortfolioMetrics(
 *   selectedPortfolio || {}
 * );
 *
 * Replace the existing independent selector with:
 *
 * <LivePortfolioSourceSelector />
 * <LivePortfolioSourceStatus />
 *
 * Replace visible holdings/metrics with:
 *
 * const holdings = visible.holdings;
 * const portfolioValue = visible.totalValue;
 * const availableCash = visible.availableCash;
 * const holdingsCount = visible.holdingsCount;
 *
 * KEEP the hub's existing analytics/cards/layout.
 *
 * IMPORTANT:
 * The selector is a VIEW filter only.
 * ALL never includes Practice.
 */

export const PC_028N_PORTFOLIO_HUB_LIVE_PATCH = true;
