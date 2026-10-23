import {
  createHash,
  randomUUID
} from "node:crypto";

function intakeError(
  status,
  code,
  message
) {
  const error =
    new Error(message);

  error.status =
    status;

  error.code =
    code;

  return error;
}

function normalizeText(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized || null;
}

function requireText(
  value,
  fieldName
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    throw intakeError(
      400,
      "FUNDAMENTAL_FILING_INTAKE_INVALID",
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function normalizeSymbol(
  value
) {
  return requireText(
    value,
    "symbol"
  ).toUpperCase();
}

function normalizeOptionalDate(
  value,
  fieldName
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized
    )
  ) {
    throw intakeError(
      400,
      "FUNDAMENTAL_FILING_INTAKE_INVALID",
      `${fieldName} must use YYYY-MM-DD.`
    );
  }

  const date =
    new Date(
      normalized + "T00:00:00Z"
    );

  if (
    Number.isNaN(
      date.getTime()
    ) ||
    date
      .toISOString()
      .slice(0, 10) !==
      normalized
  ) {
    throw intakeError(
      400,
      "FUNDAMENTAL_FILING_INTAKE_INVALID",
      `${fieldName} is invalid.`
    );
  }

  return normalized;
}

function normalizeFiscalYear(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const year =
    Number(value);

  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2200
  ) {
    throw intakeError(
      400,
      "FUNDAMENTAL_FILING_INTAKE_INVALID",
      "fiscalYear is invalid."
    );
  }

  return year;
}

function requireObject(
  value,
  fieldName
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw intakeError(
      400,
      "FUNDAMENTAL_FILING_INTAKE_INVALID",
      `${fieldName} must be an object.`
    );
  }

  return value;
}

function stableCanonicalize(
  value
) {
  if (Array.isArray(value)) {
    return value.map(
      stableCanonicalize
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object
      .keys(value)
      .sort()
      .reduce(
        (result, key) => {
          result[key] =
            stableCanonicalize(
              value[key]
            );

          return result;
        },
        {}
      );
  }

  return value;
}

function sha256Object(
  value
) {
  return createHash(
    "sha256"
  )
    .update(
      JSON.stringify(
        stableCanonicalize(value)
      )
    )
    .digest("hex");
}

export const
  FUNDAMENTAL_FILING_INTAKE_ALLOWED_FIELDS =
    Object.freeze([
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

export function
buildFundamentalFilingDraft({
  payload,
  actorUserId
} = {}) {
  const input =
    requireObject(
      payload,
      "payload"
    );

  const actor =
    requireText(
      actorUserId,
      "actorUserId"
    );

  const allowed =
    new Set(
      FUNDAMENTAL_FILING_INTAKE_ALLOWED_FIELDS
    );

  const unsupportedFields =
    Object.keys(input)
      .filter(
        field =>
          !allowed.has(field)
      )
      .sort();

  if (
    unsupportedFields.length > 0
  ) {
    const error =
      intakeError(
        400,
        "FUNDAMENTAL_FILING_INTAKE_FIELDS_INVALID",
        "Filing intake contains unsupported fields."
      );

    error.unsupportedFields =
      unsupportedFields;

    throw error;
  }

  const symbol =
    normalizeSymbol(
      input.symbol ||
      input.company?.symbol
    );

  const company =
    requireObject(
      input.company,
      "company"
    );

  const companySymbol =
    normalizeSymbol(
      company.symbol ||
      symbol
    );

  if (
    companySymbol !== symbol
  ) {
    throw intakeError(
      400,
      "FUNDAMENTAL_FILING_SYMBOL_MISMATCH",
      "Filing symbol does not match company symbol."
    );
  }

  const filingType =
    requireText(
      input.filingType,
      "filingType"
    ).toUpperCase();

  const fiscalYear =
    normalizeFiscalYear(
      input.fiscalYear ??
      company?.latestPeriod
        ?.fiscalYear
    );

  const periodStart =
    normalizeOptionalDate(
      input.periodStart,
      "periodStart"
    );

  const periodEnd =
    normalizeOptionalDate(
      input.periodEnd ??
      company?.latestPeriod
        ?.periodEnd,
      "periodEnd"
    );

  const publicationDate =
    normalizeOptionalDate(
      input.publicationDate,
      "publicationDate"
    );

  const companyName =
    normalizeText(
      input.companyName ||
      company.name ||
      symbol
    );

  const sourceDocument =
    input.sourceDocument == null
      ? {}
      : requireObject(
          input.sourceDocument,
          "sourceDocument"
        );

  const metadata =
    input.metadata == null
      ? {}
      : requireObject(
          input.metadata,
          "metadata"
        );

  /*
   * This envelope intentionally starts with no
   * lifecycle review provenance. SUBMIT / VERIFY /
   * APPROVE remain separate server transitions.
   */
  const filingPayload = {
    id: null,
    symbol,
    companyName,
    filingType,
    fiscalYear,
    periodStart,
    periodEnd,
    publicationDate,
    status:
      "DRAFT",
    revisionNumber:
      1,
    supersedesFilingId:
      null,
    supersededByFilingId:
      null,
    duplicateStatus:
      "UNIQUE",
    duplicateOfFilingId:
      null,
    sourceDocument,
    company: {
      ...company,
      symbol
    },
    review: {
      submittedAt: null,
      submittedBy: null,
      verifiedAt: null,
      verifiedBy: null,
      approvedAt: null,
      approvedBy: null
    },
    auditTrail: [],
    metadata
  };

  /*
   * Authoritative filing identity is generated by
   * the server, never accepted from the browser.
   */
  const filingId =
    `FILING-${randomUUID()}`;

  filingPayload.id =
    filingId;

  const contentHash =
    sha256Object({
      symbol,
      filingType,
      fiscalYear,
      periodStart,
      periodEnd,
      publicationDate,
      sourceDocument,
      company
    });

  filingPayload.contentHash =
    contentHash;

  return {
    filingId,
    symbol,
    companyName,
    filingType,
    fiscalYear,
    periodStart,
    periodEnd,
    publicationDate,

    /*
     * Server-owned lifecycle fields.
     */
    status:
      "DRAFT",

    revisionNumber:
      1,

    supersedesFilingId:
      null,

    supersededByFilingId:
      null,

    duplicateStatus:
      "UNIQUE",

    duplicateOfFilingId:
      null,

    contentHash,
    filingPayload,

    createdByUserId:
      actor
  };
}
