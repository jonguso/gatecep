import {
  buildCanonicalPortfolioView
} from "./canonicalPortfolioViewService";

/*
 * ============================================================
 * PC-028M
 * PORTFOLIO HUB SOURCE SERVICE
 * ============================================================
 *
 * Existing Portfolio Hub intent:
 *
 * All Accounts
 * Broker A
 * Broker B
 * Imported Portfolio
 * Practice Portfolio
 *
 * ALL excludes Practice.
 * ============================================================
 */

function n(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function buildPortfolioHubSourceState({
  selectedSourceId = null
} = {}) {
  const view =
    await buildCanonicalPortfolioView({
      selectedSourceId
    });

  const selected =
    view?.selectedPortfolio ||
    null;

  const options =
    (view?.sourceOptions || [])
      .map(
        (source) => ({
          id:
            source.id,

          label:
            source.name,

          type:
            source.type,

          isPractice:
            source.type ===
            "PRACTICE",

          isReal:
            source.type !==
            "PRACTICE",

          holdingsCount:
            Array.isArray(
              source?.holdings
            )
              ? source.holdings.length
              : 0,

          totalValue:
            n(
              source?.totalValue
            )
        })
      );

  return {
    generatedAt:
      new Date().toISOString(),

    selectedSourceId:
      view
        ?.selection
        ?.selectedSourceId ||
      null,

    defaultSourceId:
      view
        ?.selection
        ?.defaultSourceId ||
      null,

    options,

    selected,

    metrics: {
      holdingsCount:
        Array.isArray(
          selected?.holdings
        )
          ? selected.holdings.length
          : 0,

      holdingsValue:
        n(
          selected?.holdingsValue
        ),

      availableCash:
        n(
          selected?.availableCash
        ),

      totalValue:
        n(
          selected?.totalValue
        )
    },

    safeguards: {
      practiceIncludedInAll:
        false,

      selectionChangesInvestorDNA:
        false
    }
  };
}
