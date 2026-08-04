import {
  initializeFundamentalRepository
} from "./fundamentalSeedLoader";

import {
  loadFundamentalRecords
} from "./fundamentalRepository";

/*
 * ============================================================
 * PC-024B
 * PORTFOLIO FUNDAMENTAL ENRICHMENT SERVICE
 * ============================================================
 *
 * Merges persisted fundamental records into portfolio holdings
 * before PC-023B research orchestration runs.
 * ============================================================
 */

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function hasValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== ""
  );
}

function mergeWithoutReplacingWithNull(
  base,
  overlay
) {
  const result = {
    ...base
  };

  Object.entries(
    overlay || {}
  ).forEach(
    ([
      key,
      value
    ]) => {
      if (hasValue(value)) {
        result[key] =
          value;
      }
    }
  );

  return result;
}

export async function enrichPortfolioHoldingsWithFundamentals({
  holdings = [],
  initialize = true
} = {}) {
  if (initialize) {
    await initializeFundamentalRepository();
  }

  const records =
    await loadFundamentalRecords();

  const fundamentalsBySymbol =
    new Map(
      records.map(
        (record) => [
          normalizeSymbol(
            record?.symbol
          ),
          record
        ]
      )
    );

  const enriched =
    safeArray(holdings).map(
      (holding) => {
        const symbol =
          normalizeSymbol(
            holding?.symbol
          );

        const fundamentals =
          fundamentalsBySymbol.get(
            symbol
          );

        if (!fundamentals) {
          return {
            ...holding,

            symbol,

            fundamentalDataStatus:
              "NOT_FOUND",

            hasFundamentals:
              false
          };
        }

        /*
         * Market/portfolio values should remain authoritative
         * for current position data. Fundamental values fill
         * research fields but do not overwrite quantity, cost,
         * market value, or portfolio cash.
         */
        const combined =
          mergeWithoutReplacingWithNull(
            fundamentals,
            holding
          );

        return {
          ...combined,

          symbol,

          currentPrice:
            holding?.currentPrice ??
            holding?.marketPrice ??
            holding?.price ??
            fundamentals
              ?.currentPrice ??
            null,

          marketPrice:
            holding?.marketPrice ??
            holding?.currentPrice ??
            holding?.price ??
            fundamentals
              ?.currentPrice ??
            null,

          quantity:
            holding?.quantity ??
            holding?.shares ??
            0,

          marketValue:
            holding?.marketValue ??
            holding?.currentValue ??
            null,

          fundamentalDataStatus:
            fundamentals
              ?.status ||
            "UNKNOWN",

          fundamentalDataQualityScore:
            fundamentals
              ?.dataQualityScore ??
            null,

          hasFundamentals:
            Boolean(
              fundamentals
                ?.earningsPerShare !==
                null &&
              fundamentals
                ?.earningsPerShare !==
                undefined ||
              fundamentals
                ?.bookValuePerShare !==
                null &&
              fundamentals
                ?.bookValuePerShare !==
                undefined ||
              fundamentals
                ?.freeCashFlowPerShare !==
                null &&
              fundamentals
                ?.freeCashFlowPerShare !==
                undefined
            )
        };
      }
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    holdings:
      enriched,

    total:
      enriched.length,

    matched:
      enriched.filter(
        (holding) =>
          holding
            ?.fundamentalDataStatus !==
          "NOT_FOUND"
      ).length,

    researchReady:
      enriched.filter(
        (holding) =>
          holding?.hasFundamentals
      ).length,

    missing:
      enriched.filter(
        (holding) =>
          holding
            ?.fundamentalDataStatus ===
          "NOT_FOUND"
      ).map(
        (holding) =>
          holding?.symbol
      )
  };
}

export async function buildFundamentalResearchUniverse({
  holdings = []
} = {}) {
  const result =
    await enrichPortfolioHoldingsWithFundamentals({
      holdings
    });

  return result.holdings;
}
