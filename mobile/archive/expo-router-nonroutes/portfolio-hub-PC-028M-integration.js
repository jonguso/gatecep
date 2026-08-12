/*
 * ============================================================
 * PC-028M
 * PORTFOLIO HUB ACTUAL INTEGRATION GUIDE
 * ============================================================
 *
 * Replace the Portfolio Hub's independent selector construction with:
 *
 * import {
 *   buildPortfolioHubSourceState
 * } from "../src/features/portfolio-source/portfolioHubSourceService";
 *
 * import PortfolioSourceSelector from
 *   "../src/features/portfolio-source/components/PortfolioSourceSelector";
 *
 * State:
 *
 * const [sourceState, setSourceState] = useState(null);
 * const [selectedSourceId, setSelectedSourceId] = useState(null);
 *
 * async function refreshSource(nextId = selectedSourceId) {
 *   const next = await buildPortfolioHubSourceState({
 *     selectedSourceId: nextId
 *   });
 *
 *   setSelectedSourceId(next.selectedSourceId);
 *   setSourceState(next);
 * }
 *
 * Selector:
 *
 * <PortfolioSourceSelector
 *   options={sourceState?.options || []}
 *   selectedSourceId={sourceState?.selectedSourceId}
 *   onChange={(id) => {
 *     setSelectedSourceId(id);
 *     refreshSource(id);
 *   }}
 * />
 *
 * Portfolio Hub metrics / holdings should use:
 *
 * sourceState.selected
 * sourceState.metrics
 *
 * This preserves:
 *
 * All Accounts
 * Broker A
 * Broker B
 * Imported Portfolio
 * Practice Portfolio
 *
 * while guaranteeing:
 *
 * ALL NEVER includes Practice.
 */

export const PC_028M_PORTFOLIO_HUB_INTEGRATION = true;
