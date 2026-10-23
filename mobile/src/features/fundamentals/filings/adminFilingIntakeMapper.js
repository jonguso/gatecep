const SERVER_INTAKE_FIELDS = Object.freeze([
  "symbol",
  "companyName",
  "filingType",
  "fiscalYear",
  "periodStart",
  "periodEnd",
  "publicationDate",
  "sourceDocument",
  "company",
  "metadata"
]);

function normalizeText(
  value
) {
  const normalized =
    String(
      value ?? ""
    ).trim();

  return normalized || null;
}

function normalizeSymbol(
  value
) {
  return normalizeText(
    value
  )?.toUpperCase() || null;
}

function optionalObject(
  value
) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value
    : null;
}

/*
 * Projects a filing-ready / bridge-preview object onto
 * the server-authoritative fundamental filing intake
 * contract.
 *
 * Deliberately excludes client-owned lifecycle,
 * identity, duplicate and content-integrity fields.
 */
export function buildAdminFilingIntakePayload(
  filing = {}
) {
  const company =
    optionalObject(
      filing?.company
    );

  const symbol =
    normalizeSymbol(
      filing?.symbol ||
      company?.symbol
    );

  const companyName =
    normalizeText(
      filing?.companyName ||
      company?.name
    );

  const filingType =
    normalizeText(
      filing?.filingType
    )?.toUpperCase() || null;

  const fiscalYear =
    filing?.fiscalYear ??
    company?.latestPeriod
      ?.fiscalYear ??
    null;

  const periodEnd =
    normalizeText(
      filing?.periodEnd ??
      company?.latestPeriod
        ?.periodEnd
    );

  const result = {
    symbol,
    companyName,
    filingType,
    fiscalYear:
      fiscalYear === null ||
      fiscalYear === undefined ||
      fiscalYear === ""
        ? null
        : Number(fiscalYear),

    periodStart:
      normalizeText(
        filing?.periodStart
      ),

    periodEnd,

    publicationDate:
      normalizeText(
        filing?.publicationDate ||
        filing?.publishedAt
      ),

    sourceDocument:
      optionalObject(
        filing?.sourceDocument
      ) || {},

    company:
      company || {},

    metadata:
      optionalObject(
        filing?.metadata
      ) || {}
  };

  return result;
}

export function getAdminFilingIntakeFields() {
  return [
    ...SERVER_INTAKE_FIELDS
  ];
}
