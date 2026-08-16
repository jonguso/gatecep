import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  loadDividendRecords
} from "./dividendStore";

function number(
  value
) {
  const parsed =
    Number(
      value ||
      0
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function roundMoney(
  value
) {
  return Number(
    number(
      value
    ).toFixed(2)
  );
}

function normalizeSymbol(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();
}

function getYear(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.getFullYear();
}

/*
 * ============================================================
 * PC-017
 * DIVIDEND FORECAST ENGINE
 * ============================================================
 */

export async function buildDividendForecast({
  year =
    new Date()
      .getFullYear(),
  portfolio = null
} = {}) {
  const [
    investorContext,
    dividendRecords
  ] = await Promise.all([
    loadInvestorContext(),
    loadDividendRecords()
  ]);

  const selectedPortfolio =
    portfolio ||
    investorContext?.practicePortfolio ||
    {};

  const holdings =
    Array.isArray(
      selectedPortfolio
        ?.holdings
    )
      ? selectedPortfolio
          .holdings
      : [];

  const records =
    Array.isArray(
      dividendRecords
    )
      ? dividendRecords
      : [];

  const holdingMap =
    new Map();

  holdings.forEach(
    (holding) => {
      const symbol =
        normalizeSymbol(
          holding?.symbol
        );

      if (!symbol) {
        return;
      }

      holdingMap.set(
        symbol,
        holding
      );
    }
  );

  const forecastItems =
    records
      .filter(
        (record) => {
          const recordYear =
            getYear(
              record
                ?.paymentDate ||
              record
                ?.exDividendDate ||
              record
                ?.recordDate
            );

          return (
            holdingMap.has(
              normalizeSymbol(
                record?.symbol
              )
            ) &&
            recordYear ===
              Number(year) &&
            record?.status !==
              "CANCELLED"
          );
        }
      )
      .map(
        (record) => {
          const symbol =
            normalizeSymbol(
              record?.symbol
            );

          const holding =
            holdingMap.get(
              symbol
            );

          const quantity =
            number(
              holding?.quantity
            );

          const dividendPerShare =
            number(
              record
                ?.dividendPerShare
            );

          const netDividendPerShare =
            number(
              record
                ?.netDividendPerShare
            );

          const grossExpectedIncome =
            roundMoney(
              quantity *
              dividendPerShare
            );

          const netExpectedIncome =
            roundMoney(
              quantity *
              netDividendPerShare
            );

          const estimatedTax =
            roundMoney(
              grossExpectedIncome -
              netExpectedIncome
            );

          const marketValue =
            roundMoney(
              number(
                holding
                  ?.marketValue
              ) ||
              quantity *
                number(
                  holding
                    ?.marketPrice ||
                  holding?.price
                )
            );

          const forwardYield =
            marketValue > 0
              ? Number(
                  (
                    grossExpectedIncome /
                    marketValue *
                    100
                  ).toFixed(2)
                )
              : 0;

          const costValue =
            roundMoney(
              number(
                holding
                  ?.costValue ||
                holding
                  ?.investedValue
              ) ||
              quantity *
                number(
                  holding
                    ?.averagePrice ||
                  holding
                    ?.averageCost
                )
            );

          const yieldOnCost =
            costValue > 0
              ? Number(
                  (
                    grossExpectedIncome /
                    costValue *
                    100
                  ).toFixed(2)
                )
              : 0;

          return {
            id:
              record.id,

            symbol,

            companyName:
              record
                ?.companyName ||
              holding?.name ||
              symbol,

            sector:
              record?.sector ||
              holding?.sector ||
              null,

            quantity,

            dividendType:
              record
                ?.dividendType ||
              "FINAL",

            dividendPerShare,

            netDividendPerShare,

            withholdingTaxRate:
              number(
                record
                  ?.withholdingTaxRate
              ),

            grossExpectedIncome,

            estimatedTax,

            netExpectedIncome,

            marketValue,

            costValue,

            forwardYield,

            yieldOnCost,

            announcementDate:
              record
                ?.announcementDate ||
              null,

            exDividendDate:
              record
                ?.exDividendDate ||
              null,

            recordDate:
              record
                ?.recordDate ||
              null,

            paymentDate:
              record
                ?.paymentDate ||
              null,

            status:
              record?.status ||
              "ANNOUNCED",

            confidence:
              record
                ?.confidence ||
              "CONFIRMED",

            source:
              record?.source ||
              null
          };
        }
      )
      .sort(
        (a, b) => {
          const dateA =
            a?.paymentDate
              ? new Date(
                  a.paymentDate
                ).getTime()
              : Number.MAX_SAFE_INTEGER;

          const dateB =
            b?.paymentDate
              ? new Date(
                  b.paymentDate
                ).getTime()
              : Number.MAX_SAFE_INTEGER;

          return (
            dateA -
            dateB
          );
        }
      );

  const grossAnnualIncome =
    roundMoney(
      forecastItems.reduce(
        (sum, item) =>
          sum +
          number(
            item
              ?.grossExpectedIncome
          ),
        0
      )
    );

  const estimatedAnnualTax =
    roundMoney(
      forecastItems.reduce(
        (sum, item) =>
          sum +
          number(
            item?.estimatedTax
          ),
        0
      )
    );

  const netAnnualIncome =
    roundMoney(
      forecastItems.reduce(
        (sum, item) =>
          sum +
          number(
            item
              ?.netExpectedIncome
          ),
        0
      )
    );

  const monthlyAverage =
    roundMoney(
      netAnnualIncome /
      12
    );

  const quarterlyAverage =
    roundMoney(
      netAnnualIncome /
      4
    );

  const portfolioMarketValue =
    roundMoney(
      holdings.reduce(
        (sum, holding) =>
          sum +
          (
            number(
              holding
                ?.marketValue
            ) ||
            number(
              holding
                ?.quantity
            ) *
              number(
                holding
                  ?.marketPrice ||
                holding?.price
              )
          ),
        0
      )
    );

  const portfolioDividendYield =
    portfolioMarketValue > 0
      ? Number(
          (
            grossAnnualIncome /
            portfolioMarketValue *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    forecastYear:
      Number(year),

    portfolio: {
      holdingsCount:
        holdings.length,

      marketValue:
        portfolioMarketValue
    },

    summary: {
      dividendEvents:
        forecastItems.length,

      dividendPayingHoldings:
        new Set(
          forecastItems.map(
            (item) =>
              item.symbol
          )
        ).size,

      grossAnnualIncome,

      estimatedAnnualTax,

      netAnnualIncome,

      monthlyAverage,

      quarterlyAverage,

      portfolioDividendYield
    },

    items:
      forecastItems
  };
}
