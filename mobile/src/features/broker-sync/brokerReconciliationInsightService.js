import {
  buildBrokerReconciliation
} from "./brokerReconciliationService";
import {
  addBrokerSyncAuditEvent
} from "./brokerSyncAuditStore";

function money(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

export async function buildBrokerReconciliationInsight() {
  const reconciliation =
    await buildBrokerReconciliation();

  const summary =
    reconciliation?.summary || {};

  const holdings =
    Array.isArray(
      reconciliation?.holdings
    )
      ? reconciliation.holdings
      : [];

  const missingHoldings =
    holdings.filter(
      (item) =>
        item.status ===
        "MISSING_AT_BROKER"
    );

  const extraHoldings =
    holdings.filter(
      (item) =>
        item.status ===
        "EXTRA_AT_BROKER"
    );

  const differentHoldings =
    holdings.filter(
      (item) =>
        item.status ===
        "DIFFERENT"
    );

  const issues = [];

  if (missingHoldings.length) {
    issues.push({
      type:
        "HOLDINGS_MISSING",

      severity:
        "REVIEW",

      count:
        missingHoldings.length,

      symbols:
        missingHoldings.map(
          (item) =>
            item.symbol
        ),

      message:
        `${missingHoldings.length} ${
          missingHoldings.length === 1
            ? "holding is"
            : "holdings are"
        } present in GateCEP but not in the broker mirror.`
    });
  }

  if (extraHoldings.length) {
    issues.push({
      type:
        "EXTRA_HOLDINGS",

      severity:
        "REVIEW",

      count:
        extraHoldings.length,

      symbols:
        extraHoldings.map(
          (item) =>
            item.symbol
        ),

      message:
        `${extraHoldings.length} ${
          extraHoldings.length === 1
            ? "holding exists"
            : "holdings exist"
        } at the broker but not in GateCEP.`
    });
  }

  if (differentHoldings.length) {
    issues.push({
      type:
        "QUANTITY_OR_VALUE_MISMATCH",

      severity:
        "REVIEW",

      count:
        differentHoldings.length,

      symbols:
        differentHoldings.map(
          (item) =>
            item.symbol
        ),

      message:
        `${differentHoldings.length} ${
          differentHoldings.length === 1
            ? "holding has"
            : "holdings have"
        } quantity or value differences.`
    });
  }

  if (
    Math.abs(
      Number(
        summary?.cashDifference ||
        0
      )
    ) >= 0.01
  ) {
    issues.push({
      type:
        "CASH_MISMATCH",

      severity:
        "REVIEW",

      amount:
        Number(
          summary.cashDifference
        ),

      message:
        `The broker cash balance differs from GateCEP by KES ${money(
          summary.cashDifference
        )}.`
    });
  }

  const classification =
    classifyReconciliation({
      reconciliation,
      issues
    });

  const explanation =
    buildExplanation({
      reconciliation,
      missingHoldings,
      extraHoldings,
      differentHoldings
    });

  const nextAction =
    buildNextAction({
      classification,
      missingHoldings,
      extraHoldings,
      differentHoldings
    });

  const auditEvent =
    await addBrokerSyncAuditEvent({
      type:
        "BROKER_RECONCILIATION",

      broker:
        reconciliation
          ?.brokerMirror
          ?.broker ||
        null,

      status:
        reconciliation
          ?.status ||
        null,

      classification,

      brokerTotal:
        reconciliation
          ?.brokerMirror
          ?.totalValue ||
        0,

      gatecepTotal:
        reconciliation
          ?.realPortfolio
          ?.totalValue ||
        0,

      difference:
        reconciliation
          ?.summary
          ?.totalDifference ||
        0,

      cashDifference:
        reconciliation
          ?.summary
          ?.cashDifference ||
        0,

      holdingsCount:
        reconciliation
          ?.brokerMirror
          ?.holdingsCount ||
        0,

      matched:
        reconciliation
          ?.summary
          ?.matched ||
        0,

      mismatched:
        reconciliation
          ?.summary
          ?.mismatched ||
        0,

      missingAtBroker:
        reconciliation
          ?.summary
          ?.missingAtBroker ||
        0,

      extraAtBroker:
        reconciliation
          ?.summary
          ?.extraAtBroker ||
        0,

      issues
    });

  return {
    generatedAt:
      new Date().toISOString(),

    classification,

    reconciliation,

    issues,

    auditEvent,

    coachG: {
      headline:
        buildHeadline(
          classification
        ),

      explanation,

      nextAction,

      caution:
        "Coach G will explain discrepancies but will not automatically modify either the broker account or the GateCEP portfolio."
    }
  };
}
function classifyReconciliation({
  reconciliation,
  issues
}) {
  if (
    reconciliation?.status ===
    "MATCHED"
  ) {
    return "IN_SYNC";
  }

  if (
    issues.some(
      (issue) =>
        issue.type ===
        "CASH_MISMATCH"
    )
  ) {
    return "CASH_MISMATCH";
  }

  if (
    issues.some(
      (issue) =>
        issue.type ===
        "QUANTITY_OR_VALUE_MISMATCH"
    )
  ) {
    return "QUANTITY_MISMATCH";
  }

  if (
    issues.some(
      (issue) =>
        issue.type ===
        "HOLDINGS_MISSING"
    )
  ) {
    return "HOLDINGS_MISSING";
  }

  if (
    issues.some(
      (issue) =>
        issue.type ===
        "EXTRA_HOLDINGS"
    )
  ) {
    return "EXTRA_HOLDINGS";
  }

  return "NEEDS_REVIEW";
}

function buildHeadline(
  classification
) {
  switch (
    classification
  ) {
    case "IN_SYNC":
      return (
        "Your broker account and GateCEP portfolio are fully synchronized."
      );

    case "HOLDINGS_MISSING":
      return (
        "Your broker account is partially synchronized, but some GateCEP holdings are missing."
      );

    case "EXTRA_HOLDINGS":
      return (
        "Your broker account contains holdings that are not yet reflected in GateCEP."
      );

    case "QUANTITY_MISMATCH":
      return (
        "Some broker holdings do not match the quantities or values recorded in GateCEP."
      );

    case "CASH_MISMATCH":
      return (
        "Your holdings may match, but the broker cash balance differs from GateCEP."
      );

    default:
      return (
        "Your broker account requires reconciliation review."
      );
  }
}

function buildExplanation({
  reconciliation,
  missingHoldings,
  extraHoldings,
  differentHoldings
}) {
  const parts = [];

  const matched =
    Number(
      reconciliation?.summary
        ?.matched ||
      0
    );

  const totalSymbols =
    Number(
      reconciliation?.summary
        ?.totalSymbols ||
      0
    );

  if (totalSymbols) {
    parts.push(
      `${matched} of ${totalSymbols} holdings currently match.`
    );
  }

  if (
    missingHoldings.length
  ) {
    parts.push(
      `${missingHoldings
        .map(
          (item) =>
            item.symbol
        )
        .join(", ")} ${
        missingHoldings.length === 1
          ? "is"
          : "are"
      } missing from the broker mirror.`
    );
  }

  if (
    extraHoldings.length
  ) {
    parts.push(
      `${extraHoldings
        .map(
          (item) =>
            item.symbol
        )
        .join(", ")} ${
        extraHoldings.length === 1
          ? "exists"
          : "exist"
      } at the broker but not in GateCEP.`
    );
  }

  if (
    differentHoldings.length
  ) {
    parts.push(
      `${differentHoldings
        .map(
          (item) =>
            item.symbol
        )
        .join(", ")} ${
        differentHoldings.length === 1
          ? "has"
          : "have"
      } quantity or valuation differences.`
    );
  }

  const totalDifference =
    Number(
      reconciliation?.summary
        ?.totalDifference ||
      0
    );

  const cashDifference =
    Number(
      reconciliation?.summary
        ?.cashDifference ||
      0
    );

  if (
    Math.abs(
      cashDifference
    ) < 0.01
  ) {
    parts.push(
      "The cash balance matches."
    );
  } else {
    parts.push(
      `The cash balance differs by KES ${money(
        cashDifference
      )}.`
    );
  }

  if (
    Math.abs(
      totalDifference
    ) >= 0.01
  ) {
    parts.push(
      `The total broker value differs from GateCEP by KES ${money(
        totalDifference
      )}.`
    );
  }

  return (
    parts.join(" ") ||
    "No material reconciliation differences were found."
  );
}

function buildNextAction({
  classification,
  missingHoldings,
  extraHoldings,
  differentHoldings
}) {
  switch (
    classification
  ) {
    case "IN_SYNC":
      return (
        "No action is required. Continue monitoring future broker synchronization."
      );

    case "HOLDINGS_MISSING":
      return (
        `Confirm whether ${missingHoldings
          .map(
            (item) =>
              item.symbol
          )
          .join(", ")} should exist in the broker account or whether the synchronized statement is incomplete.`
      );

    case "EXTRA_HOLDINGS":
      return (
        `Review ${extraHoldings
          .map(
            (item) =>
              item.symbol
          )
          .join(", ")} and confirm whether these broker holdings should be added to the GateCEP investor record.`
      );

    case "QUANTITY_MISMATCH":
      return (
        `Review the broker quantities for ${differentHoldings
          .map(
            (item) =>
              item.symbol
          )
          .join(", ")} before making another portfolio decision.`
      );

    case "CASH_MISMATCH":
      return (
        "Review recent deposits, withdrawals, fees, dividends, and unsettled transactions before changing the portfolio."
      );

    default:
      return (
        "Review the broker statement and GateCEP portfolio side by side before making any changes."
      );
  }
}
