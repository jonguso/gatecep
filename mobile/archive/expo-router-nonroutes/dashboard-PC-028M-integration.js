/*
 * ============================================================
 * PC-028M
 * DASHBOARD ACTUAL INTEGRATION GUIDE
 * ============================================================
 *
 * Add imports:
 *
 * import {
 *   buildDashboardPortfolioSourceState
 * } from "../src/features/portfolio-source/dashboardPortfolioSourceService";
 *
 * import DashboardPortfolioSourcePanel from
 *   "../src/features/portfolio-source/components/DashboardPortfolioSourcePanel";
 *
 * Add state:
 *
 * const [portfolioSourceId, setPortfolioSourceId] = useState(null);
 * const [portfolioSourceState, setPortfolioSourceState] = useState(null);
 *
 * Loader:
 *
 * async function refreshPortfolioSource(nextSourceId = portfolioSourceId) {
 *   const state = await buildDashboardPortfolioSourceState({
 *     selectedSourceId: nextSourceId
 *   });
 *
 *   setPortfolioSourceId(state.selectedSourceId);
 *   setPortfolioSourceState(state);
 * }
 *
 * useEffect(() => {
 *   refreshPortfolioSource();
 * }, []);
 *
 * Render near the main Portfolio / Net Worth section:
 *
 * <DashboardPortfolioSourcePanel
 *   state={portfolioSourceState}
 *   onSourceChange={(sourceId) => {
 *     setPortfolioSourceId(sourceId);
 *     refreshPortfolioSource(sourceId);
 *   }}
 * />
 *
 * Dashboard visible portfolio metrics should use:
 *
 * portfolioSourceState.metrics.portfolioValue
 * portfolioSourceState.metrics.holdingsValue
 * portfolioSourceState.metrics.availableCash
 * portfolioSourceState.metrics.holdingsCount
 *
 * CRITICAL:
 *
 * If portfolioSourceState.presentation.isPractice === true:
 *   The visible portfolio area can show Practice.
 *
 * BUT real:
 *   - Net Worth
 *   - Wealth Journey
 *   - Goal Progress
 *   - DNA reconciliation
 *   - recommendation compliance
 *
 * must NOT consume Practice values.
 */

export const PC_028M_DASHBOARD_INTEGRATION = true;
