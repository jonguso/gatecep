import {
  buildHistoricalSecurityLotLedger
} from "./historicalSecurityLotLedgerService.js";

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function accountKeyOf(value) {
  return upper(
    value?.brokerAccountKey ??
    value?.broker ??
    ""
  );
}

function holdingQuantity(row) {
  return number(
    row?.quantity ??
    row?.shares ??
    0
  );
}

function holdingAveragePrice(row) {
  return number(
    row?.averagePrice ??
    row?.averageCost ??
    row?.weightedAveragePrice ??
    0
  );
}

export function buildAccountAwareFifoLedger({
  holding = null,
  transactions = [],
  symbol
} = {}) {
  if (!holding) {
    return null;
  }

  const canonicalSymbol = upper(symbol);

  const sourceRows =
    Array.isArray(holding?.sourceRows) &&
    holding.sourceRows.length
      ? holding.sourceRows
      : [holding];

  const positiveRows =
    sourceRows.filter(
      (row) => holdingQuantity(row) > 0
    );

  if (!positiveRows.length) {
    return buildHistoricalSecurityLotLedger({
      transactions,
      symbol: canonicalSymbol,
      currentQuantity: holdingQuantity(holding),
      currentAveragePrice: holdingAveragePrice(holding),
      costBasisMethod: "FIFO"
    });
  }

  /*
   * Preserve the historical single-account behavior when
   * account identity is unavailable.
   *
   * Multi-account holdings must never silently combine
   * unscoped transaction evidence.
   */
  if (positiveRows.length === 1) {
    const row = positiveRows[0];
    const accountKey = accountKeyOf(row);

    const scopedTransactions = accountKey
      ? transactions.filter(
          (transaction) =>
            accountKeyOf(transaction) === accountKey
        )
      : transactions;

    return buildHistoricalSecurityLotLedger({
      transactions: scopedTransactions,
      symbol: canonicalSymbol,
      currentQuantity: holdingQuantity(row),
      currentAveragePrice: holdingAveragePrice(row),
      costBasisMethod: "FIFO"
    });
  }

  const accountLedgers = [];

  for (const row of positiveRows) {
    const brokerAccountKey = accountKeyOf(row);

    if (!brokerAccountKey) {
      return {
        available: false,
        status: "ACCOUNT_IDENTITY_REQUIRED",
        issues: [
          "Broker-account identity is required to reconcile a multi-account FIFO position."
        ],
        accountLedgers
      };
    }

    const scopedTransactions =
      transactions.filter(
        (transaction) =>
          accountKeyOf(transaction) === brokerAccountKey
      );

    const ledger =
      buildHistoricalSecurityLotLedger({
        transactions: scopedTransactions,
        symbol: canonicalSymbol,
        currentQuantity: holdingQuantity(row),
        currentAveragePrice: holdingAveragePrice(row),
        costBasisMethod: "FIFO"
      });

    accountLedgers.push({
      brokerAccountKey,
      holding: row,
      ledger
    });

    if (!ledger?.available) {
      return {
        available: false,
        status:
          ledger?.status ||
          "ACCOUNT_FIFO_EVIDENCE_REQUIRED",
        issues: [
          `FIFO evidence is incomplete for broker account ${brokerAccountKey}.`,
          ...(Array.isArray(ledger?.issues)
            ? ledger.issues
            : [])
        ],
        accountLedgers
      };
    }
  }

  const openLots =
    accountLedgers.flatMap(
      ({ brokerAccountKey, ledger }) =>
        (Array.isArray(ledger?.openLots)
          ? ledger.openLots
          : []
        ).map((lot) => ({
          ...lot,
          brokerAccountKey
        }))
    );

  /*
   * FIFO across independently reconciled broker accounts
   * needs a deterministic combined presentation order.
   *
   * We sort by acquisition date only after each account has
   * independently passed reconciliation. This does not move
   * or consume shares between broker accounts; it only gives
   * the scenario calculator a canonical chronological view.
   */
  openLots.sort((a, b) => {
    const dateCompare =
      clean(a?.acquisitionDate).localeCompare(
        clean(b?.acquisitionDate)
      );

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return clean(a?.brokerAccountKey).localeCompare(
      clean(b?.brokerAccountKey)
    );
  });

  const acquisitions =
    accountLedgers.flatMap(
      ({ brokerAccountKey, ledger }) =>
        (Array.isArray(ledger?.acquisitions)
          ? ledger.acquisitions
          : []
        ).map((lot) => ({
          ...lot,
          brokerAccountKey
        }))
    );

  const historicalSales =
    accountLedgers.flatMap(
      ({ brokerAccountKey, ledger }) =>
        (Array.isArray(ledger?.historicalSales)
          ? ledger.historicalSales
          : []
        ).map((sale) => ({
          ...sale,
          brokerAccountKey
        }))
    );

  const reconstructedQuantity =
    accountLedgers.reduce(
      (sum, { ledger }) =>
        sum +
        number(ledger?.reconstructedQuantity),
      0
    );

  return {
    available: true,
    status: "AVAILABLE",
    issues: [],
    costBasisMethod: "FIFO",
    symbol: canonicalSymbol,
    openLots,
    acquisitions,
    historicalSales,
    reconstructedQuantity,
    accountLedgers,
    accountAware: true
  };
}
