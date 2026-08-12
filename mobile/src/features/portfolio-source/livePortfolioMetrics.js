/*
 * PC-028N
 * Common metric helpers for Dashboard and Portfolio Hub.
 */

function n(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export function buildVisiblePortfolioMetrics(
  selectedPortfolio = {}
) {
  const holdings =
    Array.isArray(
      selectedPortfolio
        ?.holdings
    )
      ? selectedPortfolio.holdings
      : [];

  const holdingsValue =
    n(
      selectedPortfolio
        ?.holdingsValue ??
      selectedPortfolio
        ?.totalMarketValue
    );

  const availableCash =
    n(
      selectedPortfolio
        ?.availableCash
    );

  const totalValue =
    n(
      selectedPortfolio
        ?.totalValue ??
      selectedPortfolio
        ?.portfolioValue
    ) ||
    (
      holdingsValue +
      availableCash
    );

  return {
    holdings,
    holdingsCount:
      holdings.length,

    holdingsValue,
    availableCash,
    totalValue
  };
}
