/*
 * Financial evidence composition boundary.
 *
 * Pure transformation only.
 *
 * Combines multiple extraction-only document previews before
 * PC-025 filing-workspace construction.
 *
 * Safety:
 * - no persistence
 * - no filing lifecycle mutation
 * - no verification / approval / promotion
 * - no silent conflict winner
 * - missing values remain unsupported
 * - evidence provenance remains document-specific
 */

const COMPOSITION_FIELDS = Object.freeze([
  "revenue",
  "grossProfit",
  "operatingIncome",
  "ebitda",
  "netIncome",
  "totalAssets",
  "totalLiabilities",
  "totalEquity",
  "cashAndEquivalents",
  "totalDebt",
  "currentAssets",
  "currentLiabilities",
  "operatingCashFlow",
  "capitalExpenditure",
  "freeCashFlow",
  "sharesOutstanding",
  "earningsPerShare",
  "bookValuePerShare",
  "dividendPerShare"
]);

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
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

function normalizeText(value) {
  return String(value || "")
    .trim();
}

function assertPreviewSafety(preview) {
  if (
    !preview ||
    typeof preview !== "object"
  ) {
    throw new Error(
      "Each financial evidence preview must be an object."
    );
  }

  if (
    preview.extractionOnly !== true ||
    preview.persistence !== "NONE"
  ) {
    throw new Error(
      "Financial evidence composition requires extraction-only, non-persistent previews."
    );
  }

  if (
    preview.verifiedFiling !== false ||
    preview.verified === true ||
    preview.authoritative === true
  ) {
    throw new Error(
      "Verified or authoritative evidence cannot enter preview composition."
    );
  }
}

function valuesEqual(first, second) {
  return (
    Number.isFinite(first) &&
    Number.isFinite(second) &&
    Object.is(first, second)
  );
}

function periodKey(period) {
  const fiscalYear =
    nullableNumber(
      period?.fiscalYear
    );

  if (fiscalYear === null) {
    throw new Error(
      "Every composed financial period requires a fiscal year."
    );
  }

  return String(fiscalYear);
}

function buildDocumentDescriptor(
  preview,
  index
) {
  return {
    documentIndex: index,
    filingType:
      preview?.filingType ||
      null,
    fiscalYear:
      nullableNumber(
        preview?.fiscalYear
      ),
    periodEnd:
      preview?.periodEnd ||
      null,
    sourceDocument:
      preview?.sourceDocument ||
      null
  };
}

export function composeFinancialEvidencePreviews(
  previews = []
) {
  if (
    !Array.isArray(previews) ||
    previews.length < 2
  ) {
    throw new Error(
      "At least two financial evidence previews are required for composition."
    );
  }

  previews.forEach(
    assertPreviewSafety
  );

  const symbols =
    [
      ...new Set(
        previews
          .map(
            preview =>
              normalizeSymbol(
                preview?.symbol
              )
          )
          .filter(Boolean)
      )
    ];

  if (symbols.length !== 1) {
    throw new Error(
      "Financial evidence previews must belong to exactly one canonical symbol."
    );
  }

  const symbol = symbols[0];

  const periodMap =
    new Map();

  const conflicts = [];

  previews.forEach(
    (preview, documentIndex) => {
      const periods =
        Array.isArray(
          preview?.periods
        )
          ? preview.periods
          : [];

      periods.forEach(
        period => {
          const key =
            periodKey(period);

          if (!periodMap.has(key)) {
            periodMap.set(
              key,
              {
                fiscalYear:
                  nullableNumber(
                    period?.fiscalYear
                  ),
                periodEnd: null
              }
            );
          }

          const target =
            periodMap.get(key);

          const incomingPeriodEnd =
            normalizeText(
              period?.periodEnd
            ) ||
            null;

          if (
            target.periodEnd === null &&
            incomingPeriodEnd !== null
          ) {
            target.periodEnd =
              incomingPeriodEnd;
          } else if (
            target.periodEnd !== null &&
            incomingPeriodEnd !== null &&
            target.periodEnd !==
              incomingPeriodEnd
          ) {
            conflicts.push({
              type:
                "PERIOD_END_CONFLICT",
              fiscalYear:
                target.fiscalYear,
              field:
                "periodEnd",
              existingValue:
                target.periodEnd,
              incomingValue:
                incomingPeriodEnd,
              documentIndex
            });
          }

          COMPOSITION_FIELDS.forEach(
            field => {
              const incoming =
                nullableNumber(
                  period?.[field]
                );

              if (incoming === null) {
                return;
              }

              const existing =
                nullableNumber(
                  target?.[field]
                );

              if (existing === null) {
                target[field] =
                  incoming;

                return;
              }

              if (
                !valuesEqual(
                  existing,
                  incoming
                )
              ) {
                conflicts.push({
                  type:
                    "FIELD_VALUE_CONFLICT",
                  fiscalYear:
                    target.fiscalYear,
                  field,
                  existingValue:
                    existing,
                  incomingValue:
                    incoming,
                  documentIndex
                });
              }
            }
          );
        }
      );
    }
  );

  if (conflicts.length) {
    const error =
      new Error(
        "Financial evidence composition contains unresolved conflicts."
      );

    error.code =
      "FINANCIAL_EVIDENCE_COMPOSITION_CONFLICT";

    error.conflicts =
      conflicts;

    throw error;
  }

  const evidence =
    previews.flatMap(
      (preview, documentIndex) =>
        (
          Array.isArray(
            preview?.evidence
          )
            ? preview.evidence
            : []
        ).map(
          item => ({
            ...item,

            compositionSource:
              buildDocumentDescriptor(
                preview,
                documentIndex
              )
          })
        )
    );

  const periods =
    [...periodMap.values()]
      .sort(
        (first, second) =>
          Number(
            second.fiscalYear
          ) -
          Number(
            first.fiscalYear
          )
      );

  const primaryPreview =
    previews[0];

  const fiscalYear =
    periods.length
      ? periods[0].fiscalYear
      : nullableNumber(
          primaryPreview?.fiscalYear
        );

  const topPeriod =
    periods.find(
      period =>
        period.fiscalYear ===
        fiscalYear
    );

  return {
    previewOnly: true,
    extractionOnly: true,
    persistence: "NONE",

    verifiedFiling: false,
    verified: false,
    authoritative: false,

    identityStatus:
      "COMPOSED",

    symbol,

    companyName:
      primaryPreview?.companyName ||
      null,

    sector:
      primaryPreview?.sector ||
      null,

    extractionPolicy:
      primaryPreview
        ?.extractionPolicy ||
      "GENERIC",

    filingType:
      "COMPOSED_FINANCIAL_EVIDENCE",

    fiscalYear,

    periodEnd:
      topPeriod?.periodEnd ||
      null,

    extractionStatus:
      "EVIDENCE_COMPOSED",

    periods,
    evidence,

    sourceDocument: {
      type:
        "MULTI_DOCUMENT_COMPOSITION",

      documentCount:
        previews.length,

      documents:
        previews.map(
          buildDocumentDescriptor
        )
    },

    composition: {
      documentCount:
        previews.length,
      conflictCount: 0
    }
  };
}

export default {
  composeFinancialEvidencePreviews
};
