import {
  loadPortfolioEvents
} from "../portfolio-ledger/portfolioEventStore";

import {
  buildCurrentPortfolioAllocation
} from "../rebalancing/allocationEngine";

const MINIMUM_RETURN_OBSERVATIONS =
  2;

const MINIMUM_PRELIMINARY_OBSERVATIONS =
  5;

const MINIMUM_RELIABLE_OBSERVATIONS =
  20;

/*
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function number(value) {
  const parsed =
    Number(
      value ?? 0
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function nullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function roundMoney(value) {
  return Number(
    number(value).toFixed(2)
  );
}

function roundPercent(value) {
  return Number(
    number(value).toFixed(4)
  );
}

function roundMetric(
  value,
  decimals = 8
) {
  const parsed =
    nullableNumber(value);

  if (
    parsed === null
  ) {
    return null;
  }

  return Number(
    parsed.toFixed(
      decimals
    )
  );
}

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(
      number(value),
      minimum
    ),
    maximum
  );
}

function normalizeDate(value) {
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

  return date;
}

function dateKey(value) {
  const date =
    normalizeDate(value);

  return date
    ? date
        .toISOString()
        .slice(
          0,
          10
        )
    : null;
}

function average(
  values = []
) {
  const safeValues =
    values
      .map(Number)
      .filter(
        Number.isFinite
      );

  if (
    !safeValues.length
  ) {
    return null;
  }

  return (
    safeValues.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
    safeValues.length
  );
}

function sampleStandardDeviation(
  values = []
) {
  const safeValues =
    values
      .map(Number)
      .filter(
        Number.isFinite
      );

  if (
    safeValues.length <
    2
  ) {
    return null;
  }

  const mean =
    average(
      safeValues
    );

  if (
    mean === null
  ) {
    return null;
  }

  const variance =
    safeValues.reduce(
      (
        sum,
        value
      ) =>
        sum +
        Math.pow(
          value -
          mean,
          2
        ),
      0
    ) /
    (
      safeValues.length -
      1
    );

  return Math.sqrt(
    variance
  );
}

function daysBetween(
  first,
  second
) {
  const start =
    normalizeDate(first);

  const end =
    normalizeDate(second);

  if (
    !start ||
    !end
  ) {
    return 0;
  }

  return Math.max(
    (
      end.getTime() -
      start.getTime()
    ) /
    86400000,
    0
  );
}

/*
 * ============================================================
 * EVENT DATE
 * ============================================================
 */

function extractEventDate(
  event = {}
) {
  return (
    event?.occurredAt ||
    event?.eventDate ||
    event?.effectiveAt ||
    event?.updatedAt ||
    event?.createdAt ||
    null
  );
}

/*
 * ============================================================
 * PORTFOLIO VALUE EXTRACTION
 * ============================================================
 */

function extractPortfolioValue(
  event = {}
) {
  const candidates = [
    event?.portfolioValueAfter,
    event?.totalValueAfter,
    event?.portfolioValue,
    event?.totalValue,

    event
      ?.snapshot
      ?.portfolioValue,

    event
      ?.snapshot
      ?.totalValue,

    event
      ?.metadata
      ?.portfolioValueAfter,

    event
      ?.metadata
      ?.totalValueAfter,

    event
      ?.metadata
      ?.portfolioValue,

    event
      ?.metadata
      ?.totalValue
  ];

  for (
    const candidate of
    candidates
  ) {
    const parsed =
      nullableNumber(
        candidate
      );

    if (
      parsed !== null &&
      parsed > 0
    ) {
      return parsed;
    }
  }

  return null;
}

/*
 * ============================================================
 * CASH-FLOW EXTRACTION
 * ============================================================
 *
 * Positive cash flow:
 * money added to the portfolio.
 *
 * Negative cash flow:
 * money withdrawn from the portfolio.
 *
 * Dividends and trading proceeds are internal portfolio activity
 * unless the event explicitly records an external contribution
 * or withdrawal.
 */

function normalizeEventType(
  event = {}
) {
  return String(
    event?.eventType ||
    event?.type ||
    ""
  )
    .trim()
    .toUpperCase();
}

function extractCashFlowAmount(
  event = {}
) {
  const eventType =
    normalizeEventType(
      event
    );

  const rawAmount =
    nullableNumber(
      event?.cashFlowAmount
    ) ??
    nullableNumber(
      event
        ?.metadata
        ?.cashFlowAmount
    ) ??
    nullableNumber(
      event?.amount
    ) ??
    nullableNumber(
      event
        ?.metadata
        ?.amount
    ) ??
    nullableNumber(
      event?.cashAmount
    ) ??
    nullableNumber(
      event
        ?.metadata
        ?.cashAmount
    );

  if (
    rawAmount ===
    null
  ) {
    return 0;
  }

  const amount =
    Math.abs(
      rawAmount
    );

  const depositTypes = [
    "CASH_DEPOSIT",
    "PORTFOLIO_CONTRIBUTION",
    "CAPITAL_CONTRIBUTION",
    "BROKER_CASH_DEPOSIT"
  ];

  const withdrawalTypes = [
    "CASH_WITHDRAWAL",
    "PORTFOLIO_WITHDRAWAL",
    "CAPITAL_WITHDRAWAL",
    "BROKER_CASH_WITHDRAWAL"
  ];

  if (
    depositTypes.includes(
      eventType
    )
  ) {
    return amount;
  }

  if (
    withdrawalTypes.includes(
      eventType
    )
  ) {
    return -amount;
  }

  const direction =
    String(
      event
        ?.cashFlowDirection ||
      event
        ?.metadata
        ?.cashFlowDirection ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    direction ===
    "INFLOW"
  ) {
    return amount;
  }

  if (
    direction ===
    "OUTFLOW"
  ) {
    return -amount;
  }

  return 0;
}

/*
 * ============================================================
 * VALUE HISTORY
 * ============================================================
 */

export async function buildPortfolioPerformanceValueSeries() {
  const [
    events,
    allocation
  ] = await Promise.all([
    loadPortfolioEvents(),
    buildCurrentPortfolioAllocation()
  ]);

  const safeEvents =
    Array.isArray(
      events
    )
      ? events
      : [];

  const dailyMap =
    new Map();

  safeEvents.forEach(
    (event) => {
      const eventDate =
        extractEventDate(
          event
        );

      const key =
        dateKey(
          eventDate
        );

      const value =
        extractPortfolioValue(
          event
        );

      if (
        !key ||
        value === null ||
        value <= 0
      ) {
        return;
      }

      const timestamp =
        normalizeDate(
          eventDate
        )?.getTime() ||
        0;

      const existing =
        dailyMap.get(
          key
        );

      if (
        !existing ||
        timestamp >=
          existing.timestamp
      ) {
        dailyMap.set(
          key,
          {
            date:
              key,

            timestamp,

            portfolioValue:
              roundMoney(
                value
              ),

            source:
              "PORTFOLIO_EVENT_LEDGER",

            eventId:
              event?.id ||
              null,

            eventType:
              normalizeEventType(
                event
              ) ||
              null
          }
        );
      }
    }
  );

  const currentValue =
    number(
      allocation
        ?.portfolio
        ?.totalValue
    );

  if (
    currentValue > 0
  ) {
    const now =
      new Date();

    const currentKey =
      dateKey(now);

    dailyMap.set(
      currentKey,
      {
        date:
          currentKey,

        timestamp:
          now.getTime(),

        portfolioValue:
          roundMoney(
            currentValue
          ),

        source:
          "CURRENT_PORTFOLIO",

        eventId:
          null,

        eventType:
          "CURRENT_VALUATION"
      }
    );
  }

  const series =
    Array.from(
      dailyMap.values()
    ).sort(
      (
        first,
        second
      ) =>
        first.timestamp -
        second.timestamp
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    observations:
      series.length,

    firstDate:
      series[0]?.date ||
      null,

    lastDate:
      series[
        series.length -
        1
      ]?.date ||
      null,

    series,

    allocation
  };
}

/*
 * ============================================================
 * CASH-FLOW HISTORY
 * ============================================================
 */

export async function buildPortfolioCashFlowSeries() {
  const events =
    await loadPortfolioEvents();

  const safeEvents =
    Array.isArray(
      events
    )
      ? events
      : [];

  const cashFlows =
    safeEvents
      .map(
        (event) => {
          const amount =
            extractCashFlowAmount(
              event
            );

          const date =
            dateKey(
              extractEventDate(
                event
              )
            );

          if (
            !date ||
            amount === 0
          ) {
            return null;
          }

          return {
            id:
              event?.id ||
              `CASH-FLOW-${date}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

            date,

            timestamp:
              normalizeDate(
                extractEventDate(
                  event
                )
              )?.getTime() ||
              0,

            eventType:
              normalizeEventType(
                event
              ),

            amount:
              roundMoney(
                amount
              ),

            direction:
              amount > 0
                ? "INFLOW"
                : "OUTFLOW",

            source:
              "PORTFOLIO_EVENT_LEDGER"
          };
        }
      )
      .filter(Boolean)
      .sort(
        (
          first,
          second
        ) =>
          first.timestamp -
          second.timestamp
      );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    observations:
      cashFlows.length,

    totalInflows:
      roundMoney(
        cashFlows.reduce(
          (
            sum,
            item
          ) =>
            sum +
            (
              item.amount > 0
                ? item.amount
                : 0
            ),
          0
        )
      ),

    totalOutflows:
      roundMoney(
        Math.abs(
          cashFlows.reduce(
            (
              sum,
              item
            ) =>
              sum +
              (
                item.amount < 0
                  ? item.amount
                  : 0
              ),
            0
          )
        )
      ),

    netCashFlow:
      roundMoney(
        cashFlows.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.amount,
          0
        )
      ),

    cashFlows
  };
}

/*
 * ============================================================
 * DAILY RETURN SERIES
 * ============================================================
 */

export async function buildPortfolioDailyReturnSeries() {
  const valueSeries =
    await buildPortfolioPerformanceValueSeries();

  const cashFlowSeries =
    await buildPortfolioCashFlowSeries();

  const cashFlowsByDate =
    new Map();

  cashFlowSeries.cashFlows.forEach(
    (cashFlow) => {
      cashFlowsByDate.set(
        cashFlow.date,
        number(
          cashFlowsByDate.get(
            cashFlow.date
          )
        ) +
        cashFlow.amount
      );
    }
  );

  const returns =
    valueSeries.series
      .map(
        (
          item,
          index
        ) => {
          if (
            index === 0
          ) {
            return {
              ...item,

              previousValue:
                null,

              externalCashFlow:
                roundMoney(
                  cashFlowsByDate.get(
                    item.date
                  )
                ),

              returnDecimal:
                null,

              returnPercentage:
                null
            };
          }

          const previous =
            valueSeries
              .series[
                index -
                1
              ];

          const previousValue =
            number(
              previous
                ?.portfolioValue
            );

          const currentValue =
            number(
              item
                ?.portfolioValue
            );

          const externalCashFlow =
            number(
              cashFlowsByDate.get(
                item.date
              )
            );

          /*
           * Cash-flow-adjusted return:
           *
           * (Ending Value - External Cash Flow) / Beginning Value - 1
           */

          const returnDecimal =
            previousValue > 0
              ? (
                  currentValue -
                  externalCashFlow
                ) /
                  previousValue -
                1
              : null;

          return {
            ...item,

            previousValue:
              roundMoney(
                previousValue
              ),

            externalCashFlow:
              roundMoney(
                externalCashFlow
              ),

            returnDecimal:
              returnDecimal ===
                null
                ? null
                : roundMetric(
                    returnDecimal,
                    10
                  ),

            returnPercentage:
              returnDecimal ===
                null
                ? null
                : roundPercent(
                    returnDecimal *
                    100
                  )
          };
        }
      );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    observations:
      returns.length,

    returnObservations:
      returns.filter(
        (item) =>
          item
            ?.returnDecimal !==
          null
      ).length,

    returns,

    valueSeries,

    cashFlowSeries
  };
}

/*
 * ============================================================
 * TIME-WEIGHTED RETURN
 * ============================================================
 */

function calculateTimeWeightedReturn(
  returns = []
) {
  const safeReturns =
    returns
      .map(
        (item) =>
          nullableNumber(
            item?.returnDecimal ??
            item
          )
      )
      .filter(
        (item) =>
          item !==
          null
      );

  if (
    !safeReturns.length
  ) {
    return null;
  }

  const growthFactor =
    safeReturns.reduce(
      (
        result,
        value
      ) =>
        result *
        (
          1 +
          value
        ),
      1
    );

  return growthFactor -
    1;
}

/*
 * ============================================================
 * PERIOD RETURN
 * ============================================================
 */

function findValueOnOrBefore({
  series,
  targetDate
}) {
  const target =
    normalizeDate(
      targetDate
    );

  if (
    !target
  ) {
    return null;
  }

  let match =
    null;

  series.forEach(
    (item) => {
      const date =
        normalizeDate(
          item?.date
        );

      if (
        date &&
        date <=
          target
      ) {
        match =
          item;
      }
    }
  );

  return match;
}

function calculatePeriodReturn({
  series,
  cashFlows,
  startDate,
  endDate
}) {
  const start =
    findValueOnOrBefore({
      series,
      targetDate:
        startDate
    });

  const end =
    findValueOnOrBefore({
      series,
      targetDate:
        endDate
    });

  if (
    !start ||
    !end ||
    start.date ===
      end.date ||
    number(
      start.portfolioValue
    ) <= 0
  ) {
    return {
      available:
        false,

      startDate:
        start?.date ||
        null,

      endDate:
        end?.date ||
        null,

      startValue:
        start
          ?.portfolioValue ??
        null,

      endValue:
        end
          ?.portfolioValue ??
        null,

      netCashFlow:
        0,

      returnDecimal:
        null,

      returnPercentage:
        null
    };
  }

  const startTimestamp =
    normalizeDate(
      start.date
    )?.getTime() ||
    0;

  const endTimestamp =
    normalizeDate(
      end.date
    )?.getTime() ||
    0;

  const netCashFlow =
    cashFlows
      .filter(
        (cashFlow) =>
          cashFlow.timestamp >
            startTimestamp &&
          cashFlow.timestamp <=
            endTimestamp
      )
      .reduce(
        (
          sum,
          cashFlow
        ) =>
          sum +
          cashFlow.amount,
        0
      );

  const returnDecimal =
    (
      number(
        end.portfolioValue
      ) -
      netCashFlow
    ) /
      number(
        start.portfolioValue
      ) -
    1;

  return {
    available:
      true,

    startDate:
      start.date,

    endDate:
      end.date,

    startValue:
      roundMoney(
        start.portfolioValue
      ),

    endValue:
      roundMoney(
        end.portfolioValue
      ),

    netCashFlow:
      roundMoney(
        netCashFlow
      ),

    returnDecimal:
      roundMetric(
        returnDecimal,
        10
      ),

    returnPercentage:
      roundPercent(
        returnDecimal *
        100
      )
  };
}

/*
 * ============================================================
 * PERIOD PERFORMANCE
 * ============================================================
 */

function buildPeriodStartDate(
  days
) {
  const date =
    new Date();

  date.setDate(
    date.getDate() -
    days
  );

  return date;
}

function buildYearStartDate() {
  const now =
    new Date();

  return new Date(
    now.getFullYear(),
    0,
    1
  );
}

export async function buildPortfolioPeriodPerformance() {
  const valueSeries =
    await buildPortfolioPerformanceValueSeries();

  const cashFlowSeries =
    await buildPortfolioCashFlowSeries();

  const series =
    valueSeries.series;

  const cashFlows =
    cashFlowSeries.cashFlows;

  const endDate =
    new Date();

  const periods = {
    oneDay:
      calculatePeriodReturn({
        series,
        cashFlows,
        startDate:
          buildPeriodStartDate(
            1
          ),
        endDate
      }),

    oneWeek:
      calculatePeriodReturn({
        series,
        cashFlows,
        startDate:
          buildPeriodStartDate(
            7
          ),
        endDate
      }),

    oneMonth:
      calculatePeriodReturn({
        series,
        cashFlows,
        startDate:
          buildPeriodStartDate(
            30
          ),
        endDate
      }),

    threeMonths:
      calculatePeriodReturn({
        series,
        cashFlows,
        startDate:
          buildPeriodStartDate(
            90
          ),
        endDate
      }),

    sixMonths:
      calculatePeriodReturn({
        series,
        cashFlows,
        startDate:
          buildPeriodStartDate(
            180
          ),
        endDate
      }),

    yearToDate:
      calculatePeriodReturn({
        series,
        cashFlows,
        startDate:
          buildYearStartDate(),
        endDate
      }),

    oneYear:
      calculatePeriodReturn({
        series,
        cashFlows,
        startDate:
          buildPeriodStartDate(
            365
          ),
        endDate
      })
  };

  const first =
    series[0] ||
    null;

  const last =
    series[
      series.length -
      1
    ] ||
    null;

  const sinceInception =
    first &&
    last
      ? calculatePeriodReturn({
          series,
          cashFlows,
          startDate:
            first.date,
          endDate:
            last.date
        })
      : {
          available:
            false,

          returnDecimal:
            null,

          returnPercentage:
            null
        };

  return {
    generatedAt:
      new Date()
        .toISOString(),

    periods,

    sinceInception,

    valueSeries,

    cashFlowSeries
  };
}

/*
 * ============================================================
 * ANNUALIZED RETURN
 * ============================================================
 */

function calculateAnnualizedReturn({
  totalReturnDecimal,
  firstDate,
  lastDate
}) {
  if (
    totalReturnDecimal ===
      null ||
    totalReturnDecimal ===
      undefined
  ) {
    return null;
  }

  const days =
    daysBetween(
      firstDate,
      lastDate
    );

  if (
    days <= 0
  ) {
    return null;
  }

  const years =
    days /
    365.25;

  if (
    years <= 0 ||
    1 +
      totalReturnDecimal <=
      0
  ) {
    return null;
  }

  return (
    Math.pow(
      1 +
        totalReturnDecimal,
      1 /
        years
    ) -
    1
  );
}

/*
 * ============================================================
 * XIRR / MONEY-WEIGHTED RETURN
 * ============================================================
 */

function xnpv({
  rate,
  cashFlows
}) {
  const firstDate =
    normalizeDate(
      cashFlows[0]?.date
    );

  if (
    !firstDate
  ) {
    return null;
  }

  return cashFlows.reduce(
    (
      total,
      cashFlow
    ) => {
      const date =
        normalizeDate(
          cashFlow.date
        );

      if (
        !date
      ) {
        return total;
      }

      const years =
        daysBetween(
          firstDate,
          date
        ) /
        365.25;

      return (
        total +
        cashFlow.amount /
          Math.pow(
            1 +
              rate,
            years
          )
      );
    },
    0
  );
}

function calculateXirr(
  cashFlows = []
) {
  const safeCashFlows =
    cashFlows
      .filter(
        (cashFlow) =>
          cashFlow?.date &&
          Number.isFinite(
            Number(
              cashFlow?.amount
            )
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          new Date(
            first.date
          ).getTime() -
          new Date(
            second.date
          ).getTime()
      );

  if (
    safeCashFlows.length <
    2
  ) {
    return null;
  }

  const hasPositive =
    safeCashFlows.some(
      (item) =>
        item.amount >
        0
    );

  const hasNegative =
    safeCashFlows.some(
      (item) =>
        item.amount <
        0
    );

  if (
    !hasPositive ||
    !hasNegative
  ) {
    return null;
  }

  let lower =
    -0.9999;

  let upper =
    10;

  let lowerValue =
    xnpv({
      rate:
        lower,

      cashFlows:
        safeCashFlows
    });

  let upperValue =
    xnpv({
      rate:
        upper,

      cashFlows:
        safeCashFlows
    });

  if (
    lowerValue ===
      null ||
    upperValue ===
      null
  ) {
    return null;
  }

  let expansionCount =
    0;

  while (
    lowerValue *
      upperValue >
      0 &&
    expansionCount <
      20
  ) {
    upper *=
      2;

    upperValue =
      xnpv({
        rate:
          upper,

        cashFlows:
          safeCashFlows
      });

    expansionCount +=
      1;
  }

  if (
    lowerValue *
      upperValue >
    0
  ) {
    return null;
  }

  for (
    let index = 0;
    index < 200;
    index += 1
  ) {
    const midpoint =
      (
        lower +
        upper
      ) /
      2;

    const midpointValue =
      xnpv({
        rate:
          midpoint,

        cashFlows:
          safeCashFlows
      });

    if (
      midpointValue ===
      null
    ) {
      return null;
    }

    if (
      Math.abs(
        midpointValue
      ) <
      0.000001
    ) {
      return midpoint;
    }

    if (
      lowerValue *
        midpointValue <=
      0
    ) {
      upper =
        midpoint;

      upperValue =
        midpointValue;
    } else {
      lower =
        midpoint;

      lowerValue =
        midpointValue;
    }
  }

  return (
    lower +
    upper
  ) /
    2;
}

function buildMoneyWeightedCashFlows({
  valueSeries,
  cashFlowSeries
}) {
  const first =
    valueSeries
      ?.series?.[0] ||
    null;

  const last =
    valueSeries
      ?.series?.[
        valueSeries
          .series
          .length -
        1
      ] ||
    null;

  if (
    !first ||
    !last
  ) {
    return [];
  }

  /*
   * Investor perspective:
   *
   * Beginning portfolio value is treated as an investment outflow.
   * Deposits are additional outflows.
   * Withdrawals are investor inflows.
   * Ending portfolio value is an investor inflow.
   */

  const flows = [
    {
      date:
        first.date,

      amount:
        -number(
          first
            .portfolioValue
        ),

      type:
        "BEGINNING_VALUE"
    }
  ];

  cashFlowSeries.cashFlows.forEach(
    (cashFlow) => {
      if (
        cashFlow.date ===
        first.date
      ) {
        return;
      }

      flows.push({
        date:
          cashFlow.date,

        amount:
          -cashFlow.amount,

        type:
          cashFlow.eventType
      });
    }
  );

  flows.push({
    date:
      last.date,

    amount:
      number(
        last
          .portfolioValue
      ),

    type:
      "ENDING_VALUE"
  });

  return flows;
}

/*
 * ============================================================
 * PERFORMANCE QUALITY
 * ============================================================
 */

function classifyPerformanceHistory(
  returnObservations
) {
  const count =
    number(
      returnObservations
    );

  if (
    count <
    MINIMUM_RETURN_OBSERVATIONS
  ) {
    return {
      status:
        "INSUFFICIENT_HISTORY",

      reliable:
        false,

      message:
        "At least two portfolio-return observations are required."
    };
  }

  if (
    count <
    MINIMUM_PRELIMINARY_OBSERVATIONS
  ) {
    return {
      status:
        "INSUFFICIENT_HISTORY",

      reliable:
        false,

      message:
        `${count} return observation(s) are available. At least ${MINIMUM_PRELIMINARY_OBSERVATIONS} are required for preliminary performance analytics.`
    };
  }

  if (
    count <
    MINIMUM_RELIABLE_OBSERVATIONS
  ) {
    return {
      status:
        "PRELIMINARY",

      reliable:
        false,

      message:
        `${count} return observations are available. Results remain preliminary until at least ${MINIMUM_RELIABLE_OBSERVATIONS} observations exist.`
    };
  }

  return {
    status:
      "READY",

    reliable:
      true,

    message:
      `${count} return observations are available for portfolio performance analysis.`
  };
}

/*
 * ============================================================
 * PC-021A
 * PORTFOLIO PERFORMANCE ENGINE
 * ============================================================
 */

export async function buildPortfolioPerformanceAnalysis() {
  const [
    dailyReturnSeries,
    periodPerformance
  ] = await Promise.all([
    buildPortfolioDailyReturnSeries(),
    buildPortfolioPeriodPerformance()
  ]);

  const valueSeries =
    dailyReturnSeries
      ?.valueSeries ||
    {};

  const cashFlowSeries =
    dailyReturnSeries
      ?.cashFlowSeries ||
    {};

  const returns =
    dailyReturnSeries
      .returns
      .filter(
        (item) =>
          item
            ?.returnDecimal !==
          null
      );

  const returnDecimals =
    returns.map(
      (item) =>
        item.returnDecimal
    );

  const history =
    classifyPerformanceHistory(
      returnDecimals.length
    );

  const timeWeightedReturnDecimal =
    calculateTimeWeightedReturn(
      returns
    );

  const annualizedTimeWeightedReturnDecimal =
    calculateAnnualizedReturn({
      totalReturnDecimal:
        timeWeightedReturnDecimal,

      firstDate:
        valueSeries
          ?.firstDate,

      lastDate:
        valueSeries
          ?.lastDate
    });

  const moneyWeightedCashFlows =
    buildMoneyWeightedCashFlows({
      valueSeries,
      cashFlowSeries
    });

  const moneyWeightedReturnDecimal =
    calculateXirr(
      moneyWeightedCashFlows
    );

  const averagePeriodicReturn =
    average(
      returnDecimals
    );

  const periodicVolatility =
    sampleStandardDeviation(
      returnDecimals
    );

  const firstValue =
    valueSeries
      ?.series?.[0]
      ?.portfolioValue ??
    null;

  const endingValue =
    valueSeries
      ?.series?.[
        valueSeries
          .series
          .length -
        1
      ]
      ?.portfolioValue ??
    null;

  const totalGainLoss =
    firstValue !==
      null &&
    endingValue !==
      null
      ? roundMoney(
          number(
            endingValue
          ) -
          number(
            firstValue
          ) -
          number(
            cashFlowSeries
              ?.netCashFlow
          )
        )
      : null;

  const positivePeriods =
    returnDecimals.filter(
      (value) =>
        value > 0
    ).length;

  const negativePeriods =
    returnDecimals.filter(
      (value) =>
        value < 0
    ).length;

  const flatPeriods =
    returnDecimals.filter(
      (value) =>
        value === 0
    ).length;

  const winningPercentage =
    returnDecimals.length > 0
      ? roundPercent(
          (
            positivePeriods /
            returnDecimals.length
          ) *
          100
        )
      : null;

  let status;

  if (
    history.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    status =
      "INSUFFICIENT_HISTORY";
  } else if (
    history.status ===
    "PRELIMINARY"
  ) {
    status =
      "PRELIMINARY";
  } else {
    status =
      "READY";
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    message:
      history.message,

    portfolio: {
      beginningValue:
        firstValue ===
          null
          ? null
          : roundMoney(
              firstValue
            ),

      endingValue:
        endingValue ===
          null
          ? null
          : roundMoney(
              endingValue
            ),

      totalGainLoss,

      totalInflows:
        roundMoney(
          cashFlowSeries
            ?.totalInflows
        ),

      totalOutflows:
        roundMoney(
          cashFlowSeries
            ?.totalOutflows
        ),

      netCashFlow:
        roundMoney(
          cashFlowSeries
            ?.netCashFlow
        )
    },

    history: {
      status:
        history.status,

      reliable:
        history.reliable,

      valuationObservations:
        number(
          valueSeries
            ?.observations
        ),

      returnObservations:
        returnDecimals.length,

      cashFlowObservations:
        number(
          cashFlowSeries
            ?.observations
        ),

      minimumPreliminaryObservations:
        MINIMUM_PRELIMINARY_OBSERVATIONS,

      minimumReliableObservations:
        MINIMUM_RELIABLE_OBSERVATIONS,

      firstDate:
        valueSeries
          ?.firstDate ||
        null,

      lastDate:
        valueSeries
          ?.lastDate ||
        null
    },

    returns: {
      timeWeightedReturnDecimal:
        roundMetric(
          timeWeightedReturnDecimal,
          10
        ),

      timeWeightedReturnPercentage:
        timeWeightedReturnDecimal ===
          null
          ? null
          : roundPercent(
              timeWeightedReturnDecimal *
              100
            ),

      annualizedTimeWeightedReturnDecimal:
        roundMetric(
          annualizedTimeWeightedReturnDecimal,
          10
        ),

      annualizedTimeWeightedReturnPercentage:
        annualizedTimeWeightedReturnDecimal ===
          null
          ? null
          : roundPercent(
              annualizedTimeWeightedReturnDecimal *
              100
            ),

      moneyWeightedReturnDecimal:
        roundMetric(
          moneyWeightedReturnDecimal,
          10
        ),

      moneyWeightedReturnPercentage:
        moneyWeightedReturnDecimal ===
          null
          ? null
          : roundPercent(
              moneyWeightedReturnDecimal *
              100
            ),

      averagePeriodicReturnDecimal:
        roundMetric(
          averagePeriodicReturn,
          10
        ),

      averagePeriodicReturnPercentage:
        averagePeriodicReturn ===
          null
          ? null
          : roundPercent(
              averagePeriodicReturn *
              100
            ),

      periodicVolatilityDecimal:
        roundMetric(
          periodicVolatility,
          10
        ),

      periodicVolatilityPercentage:
        periodicVolatility ===
          null
          ? null
          : roundPercent(
              periodicVolatility *
              100
            )
    },

    consistency: {
      positivePeriods,

      negativePeriods,

      flatPeriods,

      totalPeriods:
        returnDecimals.length,

      winningPercentage
    },

    periods:
      periodPerformance
        ?.periods ||
      {},

    sinceInception:
      periodPerformance
        ?.sinceInception ||
      null,

    moneyWeightedCashFlows,

    dailyReturnSeries,

    periodPerformance
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildPortfolioPerformanceSummary() {
  const analysis =
    await buildPortfolioPerformanceAnalysis();

  return {
    generatedAt:
      analysis.generatedAt,

    status:
      analysis.status,

    beginningValue:
      analysis
        ?.portfolio
        ?.beginningValue ??
      null,

    endingValue:
      analysis
        ?.portfolio
        ?.endingValue ??
      null,

    totalGainLoss:
      analysis
        ?.portfolio
        ?.totalGainLoss ??
      null,

    timeWeightedReturnPercentage:
      analysis
        ?.returns
        ?.timeWeightedReturnPercentage ??
      null,

    annualizedTimeWeightedReturnPercentage:
      analysis
        ?.returns
        ?.annualizedTimeWeightedReturnPercentage ??
      null,

    moneyWeightedReturnPercentage:
      analysis
        ?.returns
        ?.moneyWeightedReturnPercentage ??
      null,

    winningPercentage:
      analysis
        ?.consistency
        ?.winningPercentage ??
      null,

    returnObservations:
      analysis
        ?.history
        ?.returnObservations ||
      0,

    oneMonthReturnPercentage:
      analysis
        ?.periods
        ?.oneMonth
        ?.returnPercentage ??
      null,

    yearToDateReturnPercentage:
      analysis
        ?.periods
        ?.yearToDate
        ?.returnPercentage ??
      null,

    oneYearReturnPercentage:
      analysis
        ?.periods
        ?.oneYear
        ?.returnPercentage ??
      null,

    sinceInceptionReturnPercentage:
      analysis
        ?.sinceInception
        ?.returnPercentage ??
      null,

    message:
      analysis.message
  };
}

/*
 * ============================================================
 * PERIOD HELPERS
 * ============================================================
 */

export async function loadPortfolioPeriodReturns() {
  const result =
    await buildPortfolioPeriodPerformance();

  return result.periods;
}

export async function loadPortfolioSinceInceptionPerformance() {
  const result =
    await buildPortfolioPeriodPerformance();

  return result
    .sinceInception;
}

export async function loadPortfolioMoneyWeightedReturn() {
  const result =
    await buildPortfolioPerformanceAnalysis();

  return {
    returnDecimal:
      result
        ?.returns
        ?.moneyWeightedReturnDecimal ??
      null,

    returnPercentage:
      result
        ?.returns
        ?.moneyWeightedReturnPercentage ??
      null,

    cashFlows:
      result
        ?.moneyWeightedCashFlows ||
      []
  };
}

export async function loadPortfolioTimeWeightedReturn() {
  const result =
    await buildPortfolioPerformanceAnalysis();

  return {
    returnDecimal:
      result
        ?.returns
        ?.timeWeightedReturnDecimal ??
      null,

    returnPercentage:
      result
        ?.returns
        ?.timeWeightedReturnPercentage ??
      null,

    annualizedReturnDecimal:
      result
        ?.returns
        ?.annualizedTimeWeightedReturnDecimal ??
      null,

    annualizedReturnPercentage:
      result
        ?.returns
        ?.annualizedTimeWeightedReturnPercentage ??
      null
  };
}