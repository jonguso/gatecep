import {
  normalizeCompanyFundamentals,
  normalizeFundamentalPeriod
} from "../fundamentalDataEngine";

/*
 * ============================================================
 * PC-025D
 * FILING-TO-FUNDAMENTAL EXTRACTION SERVICE
 * ============================================================
 *
 * Converts structured annual-report entries into a filing-ready
 * JSON record for PC-025B.
 *
 * Provides:
 *
 * - period-by-period normalization,
 * - accounting equation checks,
 * - cash-flow consistency checks,
 * - per-share consistency checks,
 * - source-page references,
 * - extraction completeness,
 * - validation warnings and errors,
 * - filing JSON generation.
 *
 * Safeguards:
 *
 * - never fabricates missing values,
 * - preserves null values,
 * - clearly flags unresolved inconsistencies,
 * - does not approve or promote filings automatically.
 * ============================================================
 */

export const EXTRACTION_STATUSES = {
  READY: "READY",
  PARTIAL: "PARTIAL",
  INVALID: "INVALID",
  EMPTY: "EMPTY"
};

export const EXTRACTION_CHECK_TYPES = {
  BALANCE_SHEET: "BALANCE_SHEET",
  CASH_FLOW: "CASH_FLOW",
  PER_SHARE: "PER_SHARE",
  PERIOD: "PERIOD",
  SOURCE_REFERENCE: "SOURCE_REFERENCE"
};

export const EXTRACTION_SEVERITIES = {
  ERROR: "ERROR",
  WARNING: "WARNING",
  INFO: "INFO"
};

export const DEFAULT_EXTRACTION_POLICY = {
  accountingEquationTolerancePercentage: 1,
  cashFlowTolerancePercentage: 2,
  perShareTolerancePercentage: 2,
  minimumRequiredFields: [
    "revenue",
    "netIncome",
    "totalAssets",
    "totalLiabilities",
    "totalEquity"
  ]
};

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function nullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function number(value) {
  return nullableNumber(value) ?? 0;
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeCode(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function normalizeText(value) {
  return String(value || "")
    .trim();
}

function percentDifference(
  actual,
  expected
) {
  const actualValue =
    nullableNumber(actual);

  const expectedValue =
    nullableNumber(expected);

  if (
    actualValue === null ||
    expectedValue === null
  ) {
    return null;
  }

  const denominator =
    Math.max(
      Math.abs(expectedValue),
      1
    );

  return (
    Math.abs(
      actualValue -
      expectedValue
    ) /
    denominator
  ) *
  100;
}

function buildCheck({
  code,
  type,
  severity,
  passed,
  message,
  actual = null,
  expected = null,
  differencePercentage = null,
  field = null
}) {
  return {
    code,
    type,
    severity,
    passed,
    message,
    actual,
    expected,
    differencePercentage,
    field
  };
}

function normalizeSourceReference(
  reference = {}
) {
  return {
    id:
      reference?.id ||
      null,

    section:
      normalizeText(
        reference?.section
      ) ||
      null,

    field:
      normalizeText(
        reference?.field
      ) ||
      null,

    page:
      nullableNumber(
        reference?.page
      ),

    note:
      normalizeText(
        reference?.note
      ) ||
      null
  };
}

export function validateExtractionPeriod({
  period,
  sourceReferences = [],
  policy = {}
} = {}) {
  const normalized =
    normalizeFundamentalPeriod(
      period || {}
    );

  const config = {
    ...DEFAULT_EXTRACTION_POLICY,
    ...policy
  };

  const checks = [];

  const equityExpected =
    normalized.totalAssets !== null &&
    normalized.totalLiabilities !== null
      ? normalized.totalAssets -
        normalized.totalLiabilities
      : null;

  const equityDifference =
    percentDifference(
      normalized.totalEquity,
      equityExpected
    );

  if (
    equityDifference !== null
  ) {
    checks.push(
      buildCheck({
        code:
          "ACCOUNTING_EQUATION",

        type:
          EXTRACTION_CHECK_TYPES
            .BALANCE_SHEET,

        severity:
          equityDifference >
          config
            .accountingEquationTolerancePercentage
            ? EXTRACTION_SEVERITIES
                .ERROR
            : EXTRACTION_SEVERITIES
                .INFO,

        passed:
          equityDifference <=
          config
            .accountingEquationTolerancePercentage,

        message:
          equityDifference <=
          config
            .accountingEquationTolerancePercentage
            ? "Assets equal liabilities plus equity within tolerance."
            : "Assets do not reconcile to liabilities plus equity.",

        actual:
          normalized.totalEquity,

        expected:
          equityExpected,

        differencePercentage:
          Number(
            equityDifference.toFixed(2)
          ),

        field:
          "totalEquity"
      })
    );
  }

  const calculatedFcf =
    normalized.operatingCashFlow !== null &&
    normalized.capitalExpenditure !== null
      ? normalized.operatingCashFlow -
        Math.abs(
          normalized.capitalExpenditure
        )
      : null;

  const fcfDifference =
    percentDifference(
      normalized.freeCashFlow,
      calculatedFcf
    );

  if (
    fcfDifference !== null
  ) {
    checks.push(
      buildCheck({
        code:
          "FREE_CASH_FLOW_RECONCILIATION",

        type:
          EXTRACTION_CHECK_TYPES
            .CASH_FLOW,

        severity:
          fcfDifference >
          config
            .cashFlowTolerancePercentage
            ? EXTRACTION_SEVERITIES
                .WARNING
            : EXTRACTION_SEVERITIES
                .INFO,

        passed:
          fcfDifference <=
          config
            .cashFlowTolerancePercentage,

        message:
          fcfDifference <=
          config
            .cashFlowTolerancePercentage
            ? "Free cash flow reconciles to operating cash flow less capital expenditure."
            : "Free cash flow does not reconcile within tolerance.",

        actual:
          normalized.freeCashFlow,

        expected:
          calculatedFcf,

        differencePercentage:
          Number(
            fcfDifference.toFixed(2)
          ),

        field:
          "freeCashFlow"
      })
    );
  }

  const calculatedEps =
    normalized.netIncome !== null &&
    normalized.sharesOutstanding !== null &&
    normalized.sharesOutstanding !== 0
      ? normalized.netIncome /
        normalized.sharesOutstanding
      : null;

  const epsDifference =
    percentDifference(
      normalized.earningsPerShare,
      calculatedEps
    );

  if (
    epsDifference !== null
  ) {
    checks.push(
      buildCheck({
        code:
          "EPS_RECONCILIATION",

        type:
          EXTRACTION_CHECK_TYPES
            .PER_SHARE,

        severity:
          epsDifference >
          config
            .perShareTolerancePercentage
            ? EXTRACTION_SEVERITIES
                .WARNING
            : EXTRACTION_SEVERITIES
                .INFO,

        passed:
          epsDifference <=
          config
            .perShareTolerancePercentage,

        message:
          epsDifference <=
          config
            .perShareTolerancePercentage
            ? "EPS reconciles to net income divided by shares outstanding."
            : "EPS does not reconcile within tolerance.",

        actual:
          normalized.earningsPerShare,

        expected:
          calculatedEps,

        differencePercentage:
          Number(
            epsDifference.toFixed(2)
          ),

        field:
          "earningsPerShare"
      })
    );
  }

  safeArray(
    config.minimumRequiredFields
  ).forEach(
    (field) => {
      const available =
        normalized?.[field] !==
          null &&
        normalized?.[field] !==
          undefined;

      checks.push(
        buildCheck({
          code:
            `REQUIRED_${normalizeCode(
              field
            )}`,

          type:
            EXTRACTION_CHECK_TYPES
              .PERIOD,

          severity:
            available
              ? EXTRACTION_SEVERITIES
                  .INFO
              : EXTRACTION_SEVERITIES
                  .ERROR,

          passed:
            available,

          message:
            available
              ? `${field} is available.`
              : `${field} is missing.`,

          field
        })
      );
    }
  );

  const references =
    safeArray(
      sourceReferences
    ).map(
      normalizeSourceReference
    );

  const referencedFields =
    new Set(
      references
        .map(
          (reference) =>
            reference.field
        )
        .filter(Boolean)
    );

  safeArray(
    config.minimumRequiredFields
  ).forEach(
    (field) => {
      const hasReference =
        referencedFields.has(
          field
        );

      checks.push(
        buildCheck({
          code:
            `SOURCE_REFERENCE_${normalizeCode(
              field
            )}`,

          type:
            EXTRACTION_CHECK_TYPES
              .SOURCE_REFERENCE,

          severity:
            hasReference
              ? EXTRACTION_SEVERITIES
                  .INFO
              : EXTRACTION_SEVERITIES
                  .WARNING,

          passed:
            hasReference,

          message:
            hasReference
              ? `${field} has a source-page reference.`
              : `${field} does not have a source-page reference.`,

          field
        })
      );
    }
  );

  const errors =
    checks.filter(
      (check) =>
        check.severity ===
          EXTRACTION_SEVERITIES
            .ERROR &&
        !check.passed
    );

  const warnings =
    checks.filter(
      (check) =>
        check.severity ===
          EXTRACTION_SEVERITIES
            .WARNING &&
        !check.passed
    );

  const requiredChecks =
    checks.filter(
      (check) =>
        check.code.startsWith(
          "REQUIRED_"
        )
    );

  const completeness =
    requiredChecks.length
      ? (
          requiredChecks.filter(
            (check) =>
              check.passed
          ).length /
          requiredChecks.length
        ) *
        100
      : 0;

  return {
    status:
      errors.length
        ? EXTRACTION_STATUSES
            .INVALID
        : warnings.length
          ? EXTRACTION_STATUSES
              .PARTIAL
          : EXTRACTION_STATUSES
              .READY,

    period:
      normalized,

    sourceReferences:
      references,

    completenessPercentage:
      Number(
        completeness.toFixed(2)
      ),

    checks,

    errors,

    warnings
  };
}

export function buildFilingExtractionWorkspace({
  filing,
  periods = [],
  sourceReferences = [],
  policy = {}
} = {}) {
  const normalizedPeriods =
    safeArray(periods)
      .map(
        (period) =>
          validateExtractionPeriod({
            period,

            sourceReferences:
              safeArray(
                sourceReferences
              ).filter(
                (reference) =>
                  reference?.fiscalYear ===
                    period?.fiscalYear ||
                  !reference?.fiscalYear
              ),

            policy
          })
      );

  const company =
    normalizeCompanyFundamentals({
      ...(filing?.company || {}),

      symbol:
        filing?.symbol ||
        filing?.company?.symbol,

      name:
        filing?.companyName ||
        filing?.company?.name,

      periods:
        normalizedPeriods.map(
          (item) =>
            item.period
        )
    });

  const errors =
    normalizedPeriods.flatMap(
      (item) =>
        item.errors
    );

  const warnings =
    normalizedPeriods.flatMap(
      (item) =>
        item.warnings
    );

  const completeness =
    normalizedPeriods.length
      ? normalizedPeriods.reduce(
          (total, item) =>
            total +
            number(
              item
                .completenessPercentage
            ),
          0
        ) /
        normalizedPeriods.length
      : 0;

  const status =
    !normalizedPeriods.length
      ? EXTRACTION_STATUSES
          .EMPTY
      : errors.length
        ? EXTRACTION_STATUSES
            .INVALID
        : warnings.length
          ? EXTRACTION_STATUSES
              .PARTIAL
          : EXTRACTION_STATUSES
              .READY;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    symbol:
      normalizeSymbol(
        filing?.symbol ||
        company.symbol
      ),

    companyName:
      normalizeText(
        filing?.companyName ||
        company.name
      ),

    filingType:
      normalizeCode(
        filing?.filingType ||
        "ANNUAL_REPORT"
      ),

    fiscalYear:
      filing?.fiscalYear ??
      company?.latestPeriod
        ?.fiscalYear ??
      null,

    periodEnd:
      filing?.periodEnd ??
      company?.latestPeriod
        ?.periodEnd ??
      null,

    sourceDocument:
      filing?.sourceDocument ||
      null,

    company,

    periods:
      normalizedPeriods,

    sourceReferences:
      safeArray(
        sourceReferences
      ).map(
        normalizeSourceReference
      ),

    completenessPercentage:
      Number(
        completeness.toFixed(2)
      ),

    errors,

    warnings
  };
}

export function buildFilingReadyJson({
  workspace,
  status = "DRAFT"
} = {}) {
  if (!workspace) {
    throw new Error(
      "An extraction workspace is required."
    );
  }

  return {
    symbol:
      workspace.symbol,

    companyName:
      workspace.companyName,

    filingType:
      workspace.filingType,

    fiscalYear:
      workspace.fiscalYear,

    periodEnd:
      workspace.periodEnd,

    status:
      normalizeCode(status),

    sourceDocument:
      workspace.sourceDocument,

    company:
      workspace.company,

    metadata: {
      extractionStatus:
        workspace.status,

      extractionCompletenessPercentage:
        workspace
          .completenessPercentage,

      sourceReferences:
        workspace.sourceReferences,

      extractionErrors:
        workspace.errors,

      extractionWarnings:
        workspace.warnings,

      generatedAt:
        workspace.generatedAt
    }
  };
}
