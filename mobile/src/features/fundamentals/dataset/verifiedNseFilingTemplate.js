/*
 * ============================================================
 * PC-025A
 * VERIFIED FILING INPUT TEMPLATE
 * ============================================================
 *
 * Replace null values only with facts supported by a filing,
 * annual report, exchange announcement, regulator record,
 * broker research source, or licensed data provider.
 * ============================================================
 */

export const VERIFIED_NSE_FILING_TEMPLATE = {
  symbol:
    null,

  name:
    null,

  sector:
    null,

  industry:
    null,

  exchange:
    "NSE",

  currency:
    "KES",

  currentPrice:
    null,

  priceUpdatedAt:
    null,

  sharesOutstanding:
    null,

  marketCapitalization:
    null,

  enterpriseValue:
    null,

  periods: [
    {
      fiscalYear:
        null,

      periodType:
        "ANNUAL",

      periodEnd:
        null,

      currency:
        "KES",

      revenue:
        null,

      grossProfit:
        null,

      operatingIncome:
        null,

      ebitda:
        null,

      netIncome:
        null,

      totalAssets:
        null,

      totalLiabilities:
        null,

      totalEquity:
        null,

      cashAndEquivalents:
        null,

      totalDebt:
        null,

      currentAssets:
        null,

      currentLiabilities:
        null,

      operatingCashFlow:
        null,

      capitalExpenditure:
        null,

      freeCashFlow:
        null,

      earningsPerShare:
        null,

      bookValuePerShare:
        null,

      revenuePerShare:
        null,

      freeCashFlowPerShare:
        null,

      dividendPerShare:
        null,

      dividendsPaid:
        null,

      payoutRatioPercentage:
        null
    }
  ],

  sources: [
    {
      name:
        null,

      type:
        "COMPANY_FILING",

      authoritative:
        true,

      verified:
        true,

      url:
        null,

      publishedAt:
        null,

      retrievedAt:
        null
    }
  ],

  metadata: {
    verifiedBy:
      null,

    verificationDate:
      null,

    notes:
      null
  }
};
