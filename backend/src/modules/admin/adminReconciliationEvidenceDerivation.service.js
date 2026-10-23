function reconciliationError(
  status,
  code,
  message
) {
  const error =
    new Error(message);

  error.status = status;
  error.code = code;

  return error;
}

function requireVerifiedExtraction(
  extraction,
  identityVerification,
  expectedReportType
) {
  if (
    identityVerification?.identityVerified !== true
  ) {
    throw reconciliationError(
      409,
      "RECONCILIATION_EVIDENCE_IDENTITY_UNVERIFIED",
      "Broker evidence identity must be verified before it can become authoritative."
    );
  }

  const reportType =
    String(
      extraction?.reportType || ""
    )
      .trim()
      .toLowerCase();

  if (
    reportType !==
    expectedReportType
  ) {
    throw reconciliationError(
      409,
      "RECONCILIATION_EVIDENCE_REPORT_TYPE_INVALID",
      `Expected ${expectedReportType} broker evidence.`
    );
  }

  if (
    !Array.isArray(extraction?.rows) ||
    extraction.rows.length === 0
  ) {
    throw reconciliationError(
      422,
      "RECONCILIATION_EVIDENCE_ROWS_REQUIRED",
      "Verified broker evidence must contain structured rows."
    );
  }

  return extraction.rows;
}

function finiteNumber(
  value
) {
  const normalized =
    typeof value === "string"
      ? value.replaceAll(",", "").trim()
      : value;

  const result =
    Number(normalized);

  return Number.isFinite(result)
    ? result
    : null;
}

export function deriveAdminValuationHoldings({
  extraction,
  identityVerification
} = {}) {
  const rows =
    requireVerifiedExtraction(
      extraction,
      identityVerification,
      "valuation"
    );

  const holdings =
    rows.map(
      (row, index) => {
        const symbol =
          String(
            row?.Security || ""
          )
            .trim()
            .toUpperCase();

        const quantity =
          finiteNumber(
            row?.Quantity
          );

        const averagePrice =
          finiteNumber(
            row?.["Avg.Price"]
          );

        if (
          !symbol ||
          quantity === null ||
          quantity <= 0 ||
          averagePrice === null ||
          averagePrice < 0
        ) {
          throw reconciliationError(
            422,
            "RECONCILIATION_VALUATION_ROW_INVALID",
            `Valuation row ${index + 1} is not safe for authoritative replacement.`
          );
        }

        return {
          symbol,
          quantity,
          averagePrice
        };
      }
    );

  if (
    holdings.length === 0
  ) {
    throw reconciliationError(
      422,
      "RECONCILIATION_VALUATION_EMPTY",
      "Valuation evidence contains no authoritative holdings."
    );
  }

  return holdings;
}

export function deriveAdminCashBalance({
  extraction,
  identityVerification
} = {}) {
  const rows =
    requireVerifiedExtraction(
      extraction,
      identityVerification,
      "cash"
    );

  const datedRows =
    rows.map(
      (row, index) => {
        const dateText =
          String(
            row?.Date || ""
          ).trim();

        const timestamp =
          Date.parse(dateText);

        const balance =
          finiteNumber(
            row?.Balance
          );

        if (
          !dateText ||
          !Number.isFinite(timestamp) ||
          balance === null ||
          balance < 0
        ) {
          throw reconciliationError(
            422,
            "RECONCILIATION_CASH_ROW_INVALID",
            `Cash row ${index + 1} is not safe for authoritative replacement.`
          );
        }

        const particulars =
          String(
            row?.Particulars || ""
          );

        const hasCreditMarker =
          /\bCr\b/i.test(
            particulars
          );

        const hasDebitMarker =
          /\bDr\b/i.test(
            particulars
          );

        return {
          index,
          timestamp,
          balance,
          hasCreditMarker,
          hasDebitMarker
        };
      }
    );

  /*
   * Broker statements can contain multiple transactions
   * on the same date. Preserve document order as the
   * tie-breaker and select the latest dated transaction.
   */
  const latest =
    datedRows.reduce(
      (current, candidate) => {
        if (!current) {
          return candidate;
        }

        if (
          candidate.timestamp >
          current.timestamp
        ) {
          return candidate;
        }

        if (
          candidate.timestamp ===
            current.timestamp &&
          candidate.index >
            current.index
        ) {
          return candidate;
        }

        return current;
      },
      null
    );

  if (!latest) {
    throw reconciliationError(
      422,
      "RECONCILIATION_CASH_BALANCE_UNAVAILABLE",
      "Cash evidence does not contain a usable closing balance."
    );
  }

  if (
    latest.hasDebitMarker ||
    !latest.hasCreditMarker
  ) {
    throw reconciliationError(
      422,
      "RECONCILIATION_CASH_BALANCE_DIRECTION_UNSAFE",
      "The authoritative closing cash balance must be explicitly marked Cr."
    );
  }

  return latest.balance;
}
