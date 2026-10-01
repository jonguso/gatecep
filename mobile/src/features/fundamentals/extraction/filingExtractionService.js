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

/*
 * BANKING validation is intentionally narrower than the generic
 * industrial-company validation contract.
 *
 * Banking extraction explicitly preserves revenue and several other
 * generic industrial fields as null unless a reviewed mapping policy
 * exists. Do not manufacture those values merely to satisfy PC-025.
 */
export const BANKING_EXTRACTION_POLICY = {
  minimumRequiredFields: [
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
  const derivation =
    reference?.derivation &&
    typeof reference.derivation === "object"
      ? {
          numeratorField:
            normalizeText(
              reference.derivation
                ?.numeratorField
            ) ||
            null,

          numerator:
            nullableNumber(
              reference.derivation
                ?.numerator
            ),

          denominatorField:
            normalizeText(
              reference.derivation
                ?.denominatorField
            ) ||
            null,

          denominator:
            nullableNumber(
              reference.derivation
                ?.denominator
            ),

          beginningValue:
            nullableNumber(
              reference.derivation
                ?.beginningValue
            ),

          endingValue:
            nullableNumber(
              reference.derivation
                ?.endingValue
            ),

          denominatorConvention:
            normalizeText(
              reference.derivation
                ?.denominatorConvention
            ) ||
            null
        }
      : null;

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
      null,

    extractionMethod:
      normalizeText(
        reference?.extractionMethod
      ) ||
      null,

    accountingScope:
      normalizeText(
        reference?.accountingScope
      ) ||
      null,

    matchedText:
      normalizeText(
        reference?.matchedText
      ) ||
      null,

    sourceUnit:
      normalizeText(
        reference?.sourceUnit
      ) ||
      null,

    sourceMultiplier:
      nullableNumber(
        reference?.sourceMultiplier
      ),

    confidence:
      normalizeText(
        reference?.confidence
      ) ||
      null,

    fiscalYear:
      nullableNumber(
        reference?.fiscalYear
      ),

    derivation
  };
}

/*
 * PC-032 — Financial evidence -> PC-025 provenance adapter.
 *
 * Pure transformation only.
 *
 * This adapter does not:
 * - persist evidence,
 * - create or submit a filing,
 * - verify or approve a filing,
 * - promote fundamentals,
 * - change REAL or Practice portfolio state.
 *
 * Raw PDF page text is intentionally not accepted here.
 */
export function buildSourceReferencesFromFinancialEvidence({
  evidence = [],
  fiscalYear = null
} = {}) {
  return (Array.isArray(evidence) ? evidence : [])
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        normalizeText(item?.field)
    )
    .map((item) => {
      const hasDerivation =
        item?.numeratorField != null ||
        item?.numerator != null ||
        item?.denominatorField != null ||
        item?.denominator != null ||
        item?.beginningOwnerEquity != null ||
        item?.endingOwnerEquity != null ||
        item?.denominatorConvention != null;

      return normalizeSourceReference({
        field:
          item?.field,

        section:
          item?.statement,

        page:
          item?.pageNumber,

        note:
          null,

        extractionMethod:
          item?.extractionMethod,

        accountingScope:
          item?.accountingScope,

        matchedText:
          item?.matchedText,

        sourceUnit:
          item?.sourceUnit,

        sourceMultiplier:
          item?.sourceMultiplier,

        confidence:
          item?.confidence,

        derivation:
          hasDerivation
            ? {
                numeratorField:
                  item?.numeratorField,

                numerator:
                  item?.numerator,

                denominatorField:
                  item?.denominatorField,

                denominator:
                  item?.denominator,

                beginningValue:
                  item?.beginningOwnerEquity,

                endingValue:
                  item?.endingOwnerEquity,

                denominatorConvention:
                  item?.denominatorConvention
              }
            : null,

        fiscalYear
      });
    });
}


/*
 * PC-032 — Financial extraction preview -> PC-025 workspace.
 *
 * Pure preview transformation only.
 *
 * Safety contract:
 * - requires an extraction-only / non-persistent preview,
 * - rejects verified or authoritative input,
 * - creates no filing,
 * - performs no submission, approval, promotion, or persistence,
 * - performs no REAL or Practice portfolio mutation.
 */
export function buildFilingExtractionWorkspaceFromFinancialEvidencePreview(
  preview = {}
) {
  if (
    preview?.extractionOnly !== true ||
    preview?.persistence !== "NONE"
  ) {
    throw new Error(
      "Financial evidence must remain extraction-only and non-persistent."
    );
  }

  if (
    preview?.verifiedFiling !== false ||
    preview?.verified === true ||
    preview?.authoritative === true
  ) {
    throw new Error(
      "Financial evidence preview cannot enter PC-025 as verified or authoritative."
    );
  }

  const fiscalYear =
    nullableNumber(
      preview?.fiscalYear
    );

  const previewEvidence =
    Array.isArray(preview?.evidence)
      ? preview.evidence
      : [];

  const sourceReferences =
    buildSourceReferencesFromFinancialEvidence({
      evidence:
        previewEvidence,

      fiscalYear
    });

  const extractionPolicy =
    normalizeCode(
      preview?.extractionPolicy
    );

  const isBanking =
    extractionPolicy === "BANKING";

  const ownerProfitEvidence =
    isBanking
      ? previewEvidence.find(
          (item) =>
            normalizeText(
              item?.field
            ) ===
              "profitAttributableToOwners" &&
            normalizeCode(
              item?.accountingScope
            ) ===
              "ATTRIBUTABLE_TO_OWNERS"
        )
      : null;

  const ownerProfit =
    nullableNumber(
      ownerProfitEvidence?.value
    );

  if (
    isBanking &&
    ownerProfit === null
  ) {
    throw new Error(
      "BANKING preview requires profit attributable to owners evidence for EPS reconciliation."
    );
  }

  return buildFilingExtractionWorkspace({
    filing: {
      symbol:
        preview?.symbol,

      companyName:
        preview?.companyName,

      filingType:
        preview?.filingType ||
        "ANNUAL_REPORT",

      fiscalYear,

      periodEnd:
        preview?.periodEnd ||
        null,

      sourceDocument:
        preview?.sourceDocument ||
        null,

      company: {
        symbol:
          preview?.symbol,

        name:
          preview?.companyName,

        exchange:
          "NSE",

        currency:
          "KES"
      }
    },

    periods:
      Array.isArray(preview?.periods)
        ? preview.periods
        : [],

    sourceReferences,

    policy:
      isBanking
        ? BANKING_EXTRACTION_POLICY
        : {},

    epsReconciliationNumerator:
      isBanking
        ? ownerProfit
        : null,

    epsReconciliationNumeratorField:
      isBanking
        ? "profitAttributableToOwners"
        : "netIncome"
  });
}

export function validateExtractionPeriod({
  period,
  sourceReferences = [],
  policy = {},
  epsReconciliationNumerator = null,
  epsReconciliationNumeratorField = "netIncome"
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

  const resolvedEpsNumerator =
    nullableNumber(
      epsReconciliationNumerator
    ) ??
    (
      epsReconciliationNumeratorField ===
        "netIncome"
        ? normalized.netIncome
        : null
    );

  const calculatedEps =
    resolvedEpsNumerator !== null &&
    normalized.sharesOutstanding !== null &&
    normalized.sharesOutstanding !== 0
      ? resolvedEpsNumerator /
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
            ? `EPS reconciles to ${epsReconciliationNumeratorField} divided by shares outstanding.`
            : `EPS does not reconcile to ${epsReconciliationNumeratorField} divided by shares outstanding within tolerance.`,

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
  policy = {},
  epsReconciliationNumerator = null,
  epsReconciliationNumeratorField = "netIncome"
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

            policy,

            epsReconciliationNumerator,

            epsReconciliationNumeratorField
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
