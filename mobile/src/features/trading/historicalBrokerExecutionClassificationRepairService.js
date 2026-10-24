import {
  classifyHistoricalBrokerExecutionEvidence
} from "./historicalBrokerExecutionEvidencePolicy.js";

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function exchangeOrderNumber(row = {}) {
  return clean(
    row.exchangeOrderNo ||
    row.exchangeOrderNumber ||
    row.exchangeOrderId
  );
}

function identity(row = {}, fallbackAccountKey = "") {
  const accountKey =
    upper(
      row.brokerAccountKey ||
      row.accountKey ||
      fallbackAccountKey
    );

  const exchangeOrderNo =
    exchangeOrderNumber(row);

  if (!accountKey || !exchangeOrderNo) {
    return "";
  }

  return (
    accountKey +
    "::EXCHANGE_ORDER:" +
    upper(exchangeOrderNo)
  );
}

function historicalInput(
  row = {},
  brokerAccountKey = "",
  brokerId = ""
) {
  /*
   * Preserve the stored economic transaction.
   *
   * Classification repair does not replace economic fields.
   * It only evaluates the existing row under the historical
   * broker execution contract.
   */
  return classifyHistoricalBrokerExecutionEvidence(
    {
      ...row,

      /*
       * Do not manufacture execution quantity.
       *
       * Only a stored Total Traded Quantity may establish
       * historical execution.
       */
      totalTradedQuantity:
        Number(row.totalTradedQuantity || 0),

      /*
       * Preserve any existing/manual corrected price.
       */
      price:
        Number(row.price || 0),

      exchangeOrderNo:
        exchangeOrderNumber(row)
    },
    {
      brokerAccountKey,
      brokerId
    }
  );
}

/*
 * Pure planning function.
 *
 * NO STORAGE MUTATION occurs here.
 *
 * The caller may inspect the plan before explicitly applying
 * a future repair operation.
 */
export function planHistoricalBrokerClassificationRepair({
  brokerAccountKey,
  brokerId = "",
  verified = [],
  unverified = []
} = {}) {
  const accountKey =
    upper(brokerAccountKey);

  if (!accountKey) {
    throw new Error(
      "Broker account is required for historical classification repair."
    );
  }

  const existingVerified =
    Array.isArray(verified)
      ? verified
      : [];

  const existingUnverified =
    Array.isArray(unverified)
      ? unverified
      : [];

  const verifiedIdentities =
    new Set(
      existingVerified
        .map(row =>
          identity(row, accountKey)
        )
        .filter(Boolean)
    );

  const promoteToVerified = [];
  const needsPriceReview = [];
  const remainUnverified = [];
  const ignoredNotExecuted = [];
  const invalidIdentity = [];

  for (const original of existingUnverified) {
    const immutableIdentity =
      identity(original, accountKey);

    if (!immutableIdentity) {
      invalidIdentity.push({
        original,
        reason: "MISSING_EXCHANGE_ORDER_IDENTITY"
      });

      remainUnverified.push(original);
      continue;
    }

    /*
     * Never create a second copy when the same immutable
     * transaction already exists in verified history.
     */
    if (verifiedIdentities.has(immutableIdentity)) {
      remainUnverified.push(original);
      continue;
    }

    const classified =
      historicalInput(
        original,
        accountKey,
        brokerId
      );

    if (!classified.executionConfirmed) {
      ignoredNotExecuted.push({
        original,
        classified
      });

      /*
       * This planning gate does not delete historical storage.
       */
      remainUnverified.push(original);
      continue;
    }

    if (
      classified.historicalExecutionState ===
      "EXECUTED_NEEDS_PRICE"
    ) {
      needsPriceReview.push({
        original,
        classified,
        immutableIdentity
      });

      remainUnverified.push(original);
      continue;
    }

    if (
      classified.fifoEligible &&
      classified.historicalExecutionVerified
    ) {
      promoteToVerified.push({
        original,
        classified,
        immutableIdentity
      });

      continue;
    }

    remainUnverified.push(original);
  }

  return {
    brokerAccountKey: accountKey,

    existingVerifiedCount:
      existingVerified.length,

    existingUnverifiedCount:
      existingUnverified.length,

    promoteToVerified,

    needsPriceReview,

    remainUnverified,

    ignoredNotExecuted,

    invalidIdentity,

    summary: {
      promoteCount:
        promoteToVerified.length,

      needsPriceCount:
        needsPriceReview.length,

      remainUnverifiedCount:
        remainUnverified.length,

      ignoredNotExecutedCount:
        ignoredNotExecuted.length,

      invalidIdentityCount:
        invalidIdentity.length,

      /*
       * Economic transaction mutation is prohibited.
       */
      economicRowsUpdated: 0,

      economicRowsDeleted: 0,

      economicRowsInserted: 0
    }
  };
}
