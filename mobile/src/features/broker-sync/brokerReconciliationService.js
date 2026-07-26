import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  loadBrokerMirror
} from "./brokerSyncService";

function number(value) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function roundMoney(value) {
  return Number(
    number(value).toFixed(2)
  );
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function buildHoldingMap(
  holdings = []
) {
  const map = new Map();

  holdings.forEach(
    (holding) => {
      const symbol =
        normalizeSymbol(
          holding?.symbol
        );

      if (!symbol) {
        return;
      }

      map.set(
        symbol,
        {
          symbol,

          name:
            holding?.name ||
            holding?.companyName ||
            symbol,

          quantity:
            number(
              holding?.quantity
            ),

          marketPrice:
            number(
              holding?.marketPrice ??
              holding?.price
            ),

          marketValue:
            number(
              holding?.marketValue ??
              holding?.value
            )
        }
      );
    }
  );

  return map;
}

export async function buildBrokerReconciliation() {
  const [
    investorContext,
    brokerMirror
  ] = await Promise.all([
    loadInvestorContext(),
    loadBrokerMirror()
  ]);

  const practicePortfolio =
    investorContext
      ?.practicePortfolio ||
    null;

  if (!practicePortfolio) {
    return {
      status:
        "NO_PRACTICE_PORTFOLIO",

      message:
        "No Practice Portfolio is available for reconciliation.",

      practicePortfolio:
        null,

      brokerMirror,

      holdings:
        [],

      summary:
        emptySummary()
    };
  }

  if (!brokerMirror) {
    return {
      status:
        "NO_BROKER_MIRROR",

      message:
        "No synchronized broker portfolio is available yet.",

      practicePortfolio,

      brokerMirror:
        null,

      holdings:
        [],

      summary:
        emptySummary()
    };
  }

  const practiceHoldings =
    Array.isArray(
      practicePortfolio
        ?.holdings
    )
      ? practicePortfolio
          .holdings
      : [];

  const brokerHoldings =
    Array.isArray(
      brokerMirror?.holdings
    )
      ? brokerMirror.holdings
      : [];

  const practiceMap =
    buildHoldingMap(
      practiceHoldings
    );

  const brokerMap =
    buildHoldingMap(
      brokerHoldings
    );

  const allSymbols =
    Array.from(
      new Set([
        ...practiceMap.keys(),
        ...brokerMap.keys()
      ])
    ).sort();

  const holdingResults =
    allSymbols.map(
      (symbol) => {
        const practice =
          practiceMap.get(
            symbol
          );

        const broker =
          brokerMap.get(
            symbol
          );

        if (
          practice &&
          !broker
        ) {
          return {
            symbol,

            status:
              "MISSING_AT_BROKER",

            practice,
            broker:
              null,

            quantityDifference:
              -practice.quantity,

            valueDifference:
              -practice.marketValue
          };
        }

        if (
          !practice &&
          broker
        ) {
          return {
            symbol,

            status:
              "EXTRA_AT_BROKER",

            practice:
              null,
            broker,

            quantityDifference:
              broker.quantity,

            valueDifference:
              broker.marketValue
          };
        }

        const quantityDifference =
          roundMoney(
            broker.quantity -
            practice.quantity
          );

        const valueDifference =
          roundMoney(
            broker.marketValue -
            practice.marketValue
          );

        const quantityMatches =
          Math.abs(
            quantityDifference
          ) < 0.0001;

        const valueMatches =
          Math.abs(
            valueDifference
          ) < 0.01;

        return {
          symbol,

          status:
            quantityMatches &&
            valueMatches
              ? "MATCHED"
              : "DIFFERENT",

          practice,
          broker,

          quantityDifference,
          valueDifference
        };
      }
    );

  const practiceValue =
    roundMoney(
      practicePortfolio
        ?.investedAmount ||
      practiceHoldings.reduce(
        (sum, holding) =>
          sum +
          number(
            holding?.marketValue
          ),
        0
      )
    );

  const practiceCash =
    roundMoney(
      practicePortfolio
        ?.availableCash ||
      0
    );

  const practiceTotal =
    roundMoney(
      practiceValue +
      practiceCash
    );

  const brokerValue =
    roundMoney(
      brokerMirror
        ?.holdingsValue ||
      brokerHoldings.reduce(
        (sum, holding) =>
          sum +
          number(
            holding?.marketValue
          ),
        0
      )
    );

  const brokerCash =
    roundMoney(
      brokerMirror
        ?.cashBalance ||
      0
    );

  const brokerTotal =
    roundMoney(
      brokerValue +
      brokerCash
    );

  const matchedHoldings =
    holdingResults.filter(
      (item) =>
        item.status ===
        "MATCHED"
    );

  const mismatchedHoldings =
    holdingResults.filter(
      (item) =>
        item.status !==
        "MATCHED"
    );

  const missingAtBroker =
    holdingResults.filter(
      (item) =>
        item.status ===
        "MISSING_AT_BROKER"
    );

  const extraAtBroker =
    holdingResults.filter(
      (item) =>
        item.status ===
        "EXTRA_AT_BROKER"
    );

  const differentHoldings =
    holdingResults.filter(
      (item) =>
        item.status ===
        "DIFFERENT"
    );

  const cashDifference =
    roundMoney(
      brokerCash -
      practiceCash
    );

  const totalDifference =
    roundMoney(
      brokerTotal -
      practiceTotal
    );

  const fullyMatched =
    mismatchedHoldings.length ===
      0 &&
    Math.abs(
      cashDifference
    ) < 0.01 &&
    Math.abs(
      totalDifference
    ) < 0.01;

  const partiallyMatched =
    matchedHoldings.length >
    0;

  const status =
    fullyMatched
      ? "MATCHED"
      : partiallyMatched
      ? "PARTIAL_MATCH"
      : "OUT_OF_SYNC";

  return {
    status,

    message:
      buildStatusMessage({
        status,
        matched:
          matchedHoldings
            .length,
        mismatched:
          mismatchedHoldings
            .length
      }),

    practicePortfolio: {
      investedAmount:
        practiceValue,

      availableCash:
        practiceCash,

      totalValue:
        practiceTotal,

      holdingsCount:
        practiceHoldings
          .length
    },

    brokerMirror: {
      broker:
        brokerMirror?.broker ||
        null,

      holdingsValue:
        brokerValue,

      cashBalance:
        brokerCash,

      totalValue:
        brokerTotal,

      holdingsCount:
        brokerHoldings.length,

      syncedAt:
        brokerMirror
          ?.syncedAt ||
        null
    },

    holdings:
      holdingResults,

    summary: {
      totalSymbols:
        allSymbols.length,

      matched:
        matchedHoldings
          .length,

      mismatched:
        mismatchedHoldings
          .length,

      missingAtBroker:
        missingAtBroker.length,

      extraAtBroker:
        extraAtBroker.length,

      differentHoldings:
        differentHoldings
          .length,

      cashDifference,

      totalDifference
    }
  };
}

function emptySummary() {
  return {
    totalSymbols: 0,
    matched: 0,
    mismatched: 0,
    missingAtBroker: 0,
    extraAtBroker: 0,
    differentHoldings: 0,
    cashDifference: 0,
    totalDifference: 0
  };
}

function buildStatusMessage({
  status,
  matched,
  mismatched
}) {
  if (
    status === "MATCHED"
  ) {
    return (
      "The broker mirror matches the GateCEP portfolio."
    );
  }

  if (
    status ===
    "PARTIAL_MATCH"
  ) {
    return (
      `${matched} holdings match, while ${mismatched} require reconciliation.`
    );
  }

  return (
    "The broker mirror is currently out of sync with the GateCEP portfolio."
  );
}