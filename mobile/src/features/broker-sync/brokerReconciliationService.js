import { userGetItem } from "../../auth/userStorage";
import { loadInvestorContext } from "../investor/investorContextStore";

async function loadPracticeReconciliationEvidence() {
  const [context, mirrorRaw] = await Promise.all([
    loadInvestorContext(),
    userGetItem("practiceBrokerMirror").catch(() => null)
  ]);
  const practicePortfolio = context?.practicePortfolio || null;
  let practiceBrokerMirror = null;
  try { practiceBrokerMirror = mirrorRaw ? JSON.parse(mirrorRaw) : null; } catch { practiceBrokerMirror = null; }
  if (!practiceBrokerMirror && practicePortfolio?.holdings?.length) {
    const holdings = practicePortfolio.holdings;
    practiceBrokerMirror = {
      isPractice: true,
      mode: "PRACTICE",
      broker: "GATECEP_PRACTICE",
      accountName: "Practice Mirror",
      holdings,
      holdingsValue: holdings.reduce((sum, item) => sum + number(item?.marketValue ?? item?.value ?? (number(item?.quantity) * number(item?.marketPrice ?? item?.price))), 0),
      cashBalance: number(practicePortfolio?.availableCash),
      cashEvidenceAvailable: true,
      syncedAt: practicePortfolio?.updatedAt || null
    };
  }
  return { practicePortfolio, practiceBrokerMirror };
}

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
  const {
    practicePortfolio,
    practiceBrokerMirror: practiceMirror
  } = await loadPracticeReconciliationEvidence();
  const realPortfolio = practicePortfolio;
  const brokerMirror = practiceMirror;

  if (!practicePortfolio?.holdings?.length) {
    return {
      status:
        "NO_PRACTICE_PORTFOLIO",

      message:
        "No Practice portfolio is available for reconciliation.",

      realPortfolio:
        null,

      brokerMirror,

      holdings:
        [],

      summary:
        emptySummary()
    };
  }

  if (!practiceMirror) {
    return {
      status:
        "NO_BROKER_MIRROR",

      message:
        "No Practice broker mirror is available yet.",

      realPortfolio: practicePortfolio,

      brokerMirror:
        null,

      holdings:
        [],

      summary:
        emptySummary()
    };
  }

  if (practiceMirror?.isPractice !== true && practiceMirror?.mode !== "PRACTICE") {
    return { status: "PRACTICE_EVIDENCE_REQUIRED", message: "Only an explicitly marked Practice broker mirror can be reconciled here.", realPortfolio: practicePortfolio, brokerMirror: null, holdings: [], summary: emptySummary() };
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

  const cashEvidenceAvailable =
    brokerMirror?.runtimeMode === "REAL_CONNECTED" ||
    brokerMirror?.cashEvidenceAvailable === true;

  const brokerCash = cashEvidenceAvailable
    ? roundMoney(brokerMirror?.cashBalance || 0)
    : null;

  const brokerTotal = cashEvidenceAvailable
    ? roundMoney(brokerValue + brokerCash)
    : null;

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

  const cashDifference = cashEvidenceAvailable
    ? roundMoney(brokerCash - realCash)
    : null;

  const totalDifference = cashEvidenceAvailable
    ? roundMoney(brokerTotal - realTotal)
    : null;

  const holdingsFullyMatched =
  mismatchedHoldings.length ===
  0;

const cashFullyMatched =
  cashEvidenceAvailable &&
  Math.abs(cashDifference) < 0.01;

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

if (!cashEvidenceAvailable && holdingsFullyMatched) {
  status =
    "CASH_EVIDENCE_REQUIRED";
} else if (fullyMatched) {
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

  cashEvidenceAvailable,

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

      cashEvidenceAvailable,

      cashReconciliationStatus:
        cashEvidenceAvailable
          ? cashFullyMatched
            ? "MATCHED"
            : "MISMATCHED"
          : "EVIDENCE_REQUIRED",

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
    cashEvidenceAvailable: false,
    cashReconciliationStatus: "EVIDENCE_REQUIRED",
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

    case "CASH_EVIDENCE_REQUIRED":
      return (
        `${matched} holdings match. Upload the current broker cash or ledger statement to complete reconciliation.`
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
