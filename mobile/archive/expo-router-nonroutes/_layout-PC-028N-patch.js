/*
 * ============================================================
 * PC-028N
 * ROOT LAYOUT LIVE SOURCE PROVIDER PATCH
 * ============================================================
 *
 * In the real app/_layout.js (or the highest shared layout that wraps
 * Dashboard and Portfolio Hub), add:
 *
 * import {
 *   PortfolioSourceProvider
 * } from "../src/features/portfolio-source/PortfolioSourceContext";
 *
 * Wrap the existing Slot / Stack / Tabs:
 *
 * <PortfolioSourceProvider>
 *   ...existing navigation...
 * </PortfolioSourceProvider>
 *
 * This ensures Dashboard and Portfolio Hub share the SAME selected
 * portfolio view instead of maintaining two independent selectors.
 */

export const PC_028N_ROOT_LAYOUT_PATCH = true;
