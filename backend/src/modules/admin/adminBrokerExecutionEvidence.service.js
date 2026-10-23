function clean(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function finitePositive(value) {
  return (
    Number.isFinite(value) &&
    value > 0
  );
}

function finiteNonNegative(value) {
  return (
    Number.isFinite(value) &&
    value >= 0
  );
}

function evidenceError(
  code,
  message,
  details
) {
  const error =
    new Error(message);

  error.code =
    code;

  error.details =
    details;

  return error;
}

export function buildAdminBrokerExecutionEvidence({
  execution,
  correlation,
  sourceFileName,
  sourceFileSha256
}) {
  if (!execution) {
    throw evidenceError(
      "BROKER_EXECUTION_REQUIRED",
      "Contract-note execution is required."
    );
  }

  if (!correlation) {
    throw evidenceError(
      "BROKER_EXECUTION_CORRELATION_REQUIRED",
      "Verified order-history correlation is required."
    );
  }

  const symbol =
    clean(
      correlation.symbol
    ).toUpperCase();

  if (!symbol) {
    throw evidenceError(
      "BROKER_EXECUTION_SYMBOL_REQUIRED",
      "Resolved security code is required."
    );
  }

  const side =
    clean(
      execution.side
    ).toUpperCase();

  if (
    side !== "BUY" &&
    side !== "SELL"
  ) {
    throw evidenceError(
      "BROKER_EXECUTION_SIDE_INVALID",
      "Execution side must be BUY or SELL."
    );
  }

  if (
    !finitePositive(
      execution.sharesTraded
    ) ||
    !finitePositive(
      execution.averageTradePrice
    )
  ) {
    throw evidenceError(
      "BROKER_EXECUTION_ECONOMICS_INVALID",
      "Execution quantity and price must be positive."
    );
  }

  if (
    !finiteNonNegative(
      execution.totalCharges
    )
  ) {
    throw evidenceError(
      "BROKER_EXECUTION_CHARGES_INVALID",
      "Execution charges must be non-negative."
    );
  }

  if (
    !execution.tradeDate ||
    !execution.settlementDate
  ) {
    throw evidenceError(
      "BROKER_EXECUTION_DATES_REQUIRED",
      "Trade and settlement dates are required."
    );
  }

  if (
    execution.economicsVerified !==
    true
  ) {
    throw evidenceError(
      "BROKER_EXECUTION_ECONOMICS_UNVERIFIED",
      "Contract-note economics must be verified."
    );
  }

  if (
    !Array.isArray(
      correlation.matchedOrders
    ) ||
    correlation.matchedOrders.length === 0
  ) {
    throw evidenceError(
      "BROKER_EXECUTION_PROVENANCE_REQUIRED",
      "Matched order provenance is required."
    );
  }

  if (
    !finitePositive(
      correlation.historyQuantity
    )
  ) {
    throw evidenceError(
      "BROKER_EXECUTION_HISTORY_QUANTITY_INVALID",
      "Correlated history quantity must be a positive finite number."
    );
  }

  if (
    Math.abs(
      correlation.historyQuantity -
      execution.sharesTraded
    ) >= 0.000001
  ) {
    throw evidenceError(
      "BROKER_EXECUTION_QUANTITY_MISMATCH",
      "Correlated history quantity does not match execution quantity."
    );
  }

  const executionIdentity =
    clean(
      execution.executionIdentity
    );

  if (!executionIdentity) {
    throw evidenceError(
      "BROKER_EXECUTION_IDENTITY_REQUIRED",
      "Deterministic execution identity is required."
    );
  }

  const fileName =
    clean(
      sourceFileName
    );

  const fileSha256 =
    clean(
      sourceFileSha256
    ).toLowerCase();

  if (!fileName) {
    throw evidenceError(
      "BROKER_EXECUTION_SOURCE_FILE_REQUIRED",
      "Source contract-note file name is required."
    );
  }

  if (
    !/^[a-f0-9]{64}$/.test(
      fileSha256
    )
  ) {
    throw evidenceError(
      "BROKER_EXECUTION_SOURCE_DIGEST_INVALID",
      "Source contract-note SHA-256 is required."
    );
  }

  /*
   * The contract-note page/security summary is the
   * authoritative priced execution unit.
   *
   * Underlying broker orders are provenance only.
   * Price and charges are deliberately NOT allocated
   * across those orders.
   */
  return {
    executionIdentity,

    symbol,
    side,

    executedQuantity:
      execution.sharesTraded,

    executionPrice:
      execution.averageTradePrice,

    executionDate:
      execution.tradeDate,

    settlementDate:
      execution.settlementDate,

    totalFees:
      execution.totalCharges,

    executionStatus:
      "COMPLETED",

    evidenceStatus:
      "CONTRACT_NOTE_VERIFIED",

    canAffectRealPortfolio:
      true,

    source: {
      fileName,
      fileSha256,
      pageNumber:
        execution.pageNumber
    },

    brokerIdentity: {
      broker:
        clean(
          execution.broker
        ).toUpperCase(),

      clientCode:
        clean(
          execution.clientCode
        ),

      tradingAccount:
        clean(
          execution.tradingAccount
        )
    },

    economics: {
      grossConsideration:
        execution.grossConsideration,

      totalCharges:
        execution.totalCharges,

      netAmount:
        execution.netAmount,

      netAmountType:
        execution.netAmountType,

      economicsVerified:
        true
    },

    correlation: {
      symbol,

      historyQuantity:
        correlation.historyQuantity,

      matchedOrders:
        correlation.matchedOrders
          .map(
            order => ({
              ...order,
              contractNumbers:
                [
                  ...(order.contractNumbers ?? [])
                ]
            })
          )
    },

    rawEvidence: {
      isin:
        execution.isin,

      securityName:
        execution.securityName,

      executionIdentityBase:
        execution.identityBase,

      orderProvenance:
        execution.orderProvenance
    }
  };
}
