function clean(value) {
  return String(value ?? "").trim();
}

function canonicalSymbol(value) {
  const symbol =
    clean(value).toUpperCase();

  if (!/^[A-Z0-9]+$/.test(symbol)) {
    throw new Error(
      "A canonical NSE security symbol is required."
    );
  }

  return symbol;
}

function canonicalFiscalYear(value) {
  const year = Number(value);

  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2200
  ) {
    throw new Error(
      "A valid filing fiscal year is required."
    );
  }

  return year;
}

function canonicalFilingType(value) {
  const filingType =
    clean(value).toUpperCase();

  if (!filingType) {
    throw new Error(
      "A filing type is required."
    );
  }

  return filingType;
}

function canonicalSource(value) {
  const source =
    clean(value).toUpperCase();

  if (!source) {
    throw new Error(
      "A document source is required."
    );
  }

  return source;
}

/*
 * Pure boundary adapter.
 *
 * This function performs:
 * - no retrieval
 * - no filesystem write
 * - no database mutation
 * - no verification
 * - no approval
 * - no promotion
 *
 * Its only responsibility is to construct the exact
 * identity/expectation contract consumed by F14F.
 */
export function buildFundamentalDocumentRetentionBoundary({
  symbol,
  identity,
  extraction,
  retrieval,
  source
} = {}) {
  const expectedSymbol =
    canonicalSymbol(symbol);

  if (
    identity?.identityStatus !==
      "IDENTIFIED"
  ) {
    throw new Error(
      "Document identity must be IDENTIFIED before retention."
    );
  }

  const identitySymbol =
    canonicalSymbol(
      identity?.symbol
    );

  if (
    identitySymbol !==
    expectedSymbol
  ) {
    throw new Error(
      "Document issuer does not match the expected security."
    );
  }

  const identityFiscalYear =
    canonicalFiscalYear(
      identity?.fiscalYear
    );

  const identityFilingType =
    canonicalFilingType(
      identity?.filingType
    );

  /*
   * Extraction is corroborating evidence.
   * It must agree with the identity inspector rather
   * than becoming an alternate source of truth.
   */
  if (extraction) {
    const extractionSymbol =
      canonicalSymbol(
        extraction?.symbol
      );

    const extractionFiscalYear =
      canonicalFiscalYear(
        extraction?.fiscalYear
      );

    const extractionFilingType =
      canonicalFilingType(
        extraction?.filingType
      );

    if (
      extractionSymbol !==
        identitySymbol ||
      extractionFiscalYear !==
        identityFiscalYear ||
      extractionFilingType !==
        identityFilingType
    ) {
      throw new Error(
        "Identity and extraction evidence disagree."
      );
    }
  }

  if (!retrieval) {
    throw new Error(
      "Retrieval evidence is required."
    );
  }

  /*
   * Preserve the preview retrieval evidence unchanged.
   * F14C remains the authority that decides whether
   * this evidence can become retention-eligible.
   */
  return {
    expectedSymbol,
    expectedFiscalYear:
      identityFiscalYear,
    expectedFilingType:
      identityFilingType,
    source:
      canonicalSource(source),
    identity,
    retrieval
  };
}

export default {
  buildFundamentalDocumentRetentionBoundary
};
