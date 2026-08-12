/**
 * ============================================================
 * PC-030C2B9
 * Canonical Portfolio Snapshot Lifecycle Trigger
 * ============================================================
 *
 * Mutation boundary adapter.
 *
 * A portfolio/cash mutation must succeed independently of
 * performance-history capture.
 *
 * Snapshot failures are therefore logged but never allowed to
 * roll back or falsely fail the primary investor action.
 * ============================================================
 */

import {
  saveCanonicalRealPortfolioSnapshot
} from "./portfolioSnapshot";


export async function refreshCanonicalRealPortfolioSnapshot({
  reason = "PORTFOLIO_MUTATION"
} = {}) {
  try {
    const snapshot =
      await saveCanonicalRealPortfolioSnapshot({
        triggerReason:
          reason
      });

    return {
      ok:
        Boolean(snapshot),

      snapshot,

      reason
    };

  } catch (error) {
    console.warn(
      "[PC-030C2B9] Snapshot refresh skipped:",
      reason,
      error?.message ||
      error
    );

    return {
      ok:
        false,

      snapshot:
        null,

      reason,

      error:
        error?.message ||
        String(error)
    };
  }
}
