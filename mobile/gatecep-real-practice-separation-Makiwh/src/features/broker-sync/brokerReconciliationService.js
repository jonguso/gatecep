import {
  loadCanonicalRealBrokerPortfolio
} from "./canonicalRealBrokerPortfolioService";

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
    realPortfolio,
    brokerMirror
  ] = await Promise.all([
    loadCanonicalRealBrokerPortfolio(),
    loadBrokerMirror()
  ]);

  if (!realPortfolio?.holdings?.length) {
    return {
      status:
        "NO_REAL_PORTFOLIO",

      message:
        "No canonical REAL portfolio is available for reconciliation.",

      realPortfolio:
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

      realPortfolio,

      brokerMirror:
        null,

      holdings:
        [],

      summary:
        emptySummary()
    };
  }

  if (brokerMirror?.runtimeMode !== "REAL_CONNECTED") {
    return {
      status: "NO_VERIFIED_BROKER_MIRROR",
      message:
        "A fresh connected-broker synchronization is required before reconciliation.",
      realPortfolio,
      brokerMirror: null,
      holdings: [],
      summary: emptySummary()
    };
  }

  const realHoldings =
    Array.isArray(
      realPortfolio
        ?.holdings
    )
      ? realPortfolio
          .holdings
      : [];

  const brokerHoldings =
    Array.isArray(
      brokerMirror?.holdings
    )
      ? brokerMirror.holdings
      : [];

  const realMap =
    buildHoldingMap(
      realHoldings
    );

  const brokerMap =
    buildHoldingMap(
      brokerHoldings
    );

  const allSymbols =
    Array.from(
      new Set([
        ...realMap.keys(),
        ...brokerMap.keys()
      ])
    ).sort();

  const holdingResults =
    allSymbols.map(
      (symbol) => {
        const real =
          realMap.get(
            symbol
          );

        const broker =
          brokerMap.get(
            symbol
          );

        if (
          real &&
          !broker
        ) {
          return {
            symbol,

            status:
              "MISSING_AT_BROKER",

            real,
            broker:
              null,

            quantityDifference:
              -real.quantity,

            valueDifference:
              -real.marketValue
          };
        }

        if (
          !real &&
          broker
        ) {
          return {
            symbol,

            status:
              "EXTRA_AT_BROKER",

            real:
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
            real.quantity
          );

        const valueDifference =
          roundMoney(
            broker.marketValue -
            real.marketValue
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

          real,
          broker,

          quantityDifference,
          valueDifference
        };
      }
    );

  const realValue =
  roundMoney(
    realHoldings.reduce(
      (sum, holding) => {
        const quantity =
          number(
            holding?.quantity
          );

        const marketPrice =
          number(
            holding?.marketPrice ??
            holding?.price
          );

        const marketValue =
          number(
            holding?.marketValue ??
            holding?.value
          );

        return (
          sum +
          (
            marketValue ||
            quantity *
              marketPrice
          )
        );
      },
      0
    )
  );

  const realCash =
    roundMoney(
      realPortfolio
        ?.availableCash ||
      0
    );

  const realTotal =
    roundMoney(
      realValue +
      realCash
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
      realCash
    );

  const totalDifference =
    roundMoney(
      brokerTotal -
      realTotal
    );

  const holdingsFullyMatched =
  mismatchedHoldings.length ===
  0;

const cashFullyMatched =
  Math.abs(
    cashDifference
  ) < 0.01;

const totalFullyMatched =
  Math.abs(
    totalDifference
  ) < 0.01;

const fullyMatched =
  holdingsFullyMatched &&
  cashFullyMatched &&
  totalFullyMatched;

const partiallyMatched =
  matchedHoldings.length > 0 &&
  mismatchedHoldings.length > 0;

let status;

if (fullyMatched) {
  status =
    "MATCHED";
} else if (
  holdingsFullyMatched
) {
  status =
    "HOLDINGS_MATCH";
} else if (
  partiallyMatched
) {
  status =
    "PARTIAL_MATCH";
} else {
  status =
    "OUT_OF_SYNC";
}

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

    realPortfolio: {
      investedAmount:
        realValue,

      availableCash:
        realCash,

      totalValue:
        realTotal,

      holdingsCount:
        realHoldings
          .length
    },

    brokerMirror: {
  broker:
    brokerMirror?.broker ||
    null,

  accountName:
    brokerMirror?.accountName ||
    null,

  brokerAccountId:
    brokerMirror?.brokerAccountId ||
    null,

  currency:
    brokerMirror?.currency ||
    "KES",

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
  switch (status) {
    case "MATCHED":
      return (
        "The broker account and GateCEP portfolio are fully reconciled."
      );

    case "HOLDINGS_MATCH":
      return (
        `${matched} holdings match, but the cash balance or total account value still requires reconciliation.`
      );

    case "PARTIAL_MATCH":
      return (
        `${matched} holdings match, while ${mismatched} require reconciliation.`
      );

    case "OUT_OF_SYNC":
      return (
        "The broker mirror is currently out of sync with the GateCEP portfolio."
      );

    default:
      return (
        "The broker reconciliation status requires review."
      );
  }
}
