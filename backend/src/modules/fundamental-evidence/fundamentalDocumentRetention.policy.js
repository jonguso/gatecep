import {
  buildFundamentalDocumentStorageIdentity
} from "./fundamentalDocumentStorage.policy.js";

function clean(value) {
  return String(value ?? "").trim();
}

function canonicalSymbol(value) {
  return clean(value).toUpperCase();
}

function canonicalFilingType(value) {
  return clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function fiscalYear(value) {
  const year =
    Number(value);

  return Number.isInteger(year)
    ? year
    : null;
}

function resolveIdentityStatus(identity) {
  return clean(
    identity?.identityStatus
  ).toUpperCase();
}

function identityIsValidated(identity) {
  const status =
    resolveIdentityStatus(identity);

  return status === "IDENTIFIED";
}

export function evaluateFundamentalDocumentRetention({
  expectedSymbol,
  expectedFiscalYear,
  expectedFilingType = "ANNUAL_REPORT",
  source,
  identity,
  retrieval
} = {}) {
  const symbol =
    canonicalSymbol(expectedSymbol);

  const year =
    fiscalYear(expectedFiscalYear);

  const filingType =
    canonicalFilingType(
      expectedFilingType
    );

  if (!symbol) {
    return {
      eligible: false,
      reason:
        "EXPECTED_SYMBOL_REQUIRED"
    };
  }

  if (!year) {
    return {
      eligible: false,
      reason:
        "EXPECTED_FISCAL_YEAR_REQUIRED"
    };
  }

  if (!filingType) {
    return {
      eligible: false,
      reason:
        "EXPECTED_FILING_TYPE_REQUIRED"
    };
  }

  if (!identityIsValidated(identity)) {
    return {
      eligible: false,
      reason:
        "IDENTITY_NOT_VALIDATED"
    };
  }

  const identitySymbol =
    canonicalSymbol(
      identity?.symbol
    );

  if (
    !identitySymbol ||
    identitySymbol !== symbol
  ) {
    return {
      eligible: false,
      reason:
        "SYMBOL_MISMATCH"
    };
  }

  const identityFiscalYear =
    fiscalYear(
      identity?.fiscalYear
    );

  if (
    !identityFiscalYear ||
    identityFiscalYear !== year
  ) {
    return {
      eligible: false,
      reason:
        "FISCAL_YEAR_MISMATCH"
    };
  }

  const identityFilingType =
    canonicalFilingType(
      identity?.filingType
    );

  if (
    !identityFilingType ||
    identityFilingType !== filingType
  ) {
    return {
      eligible: false,
      reason:
        "FILING_TYPE_MISMATCH"
    };
  }

  if (
    retrieval?.persistence !== "NONE" ||
    retrieval?.verifiedFiling !== false ||
    retrieval?.verified === true ||
    retrieval?.authoritative === true
  ) {
    return {
      eligible: false,
      reason:
        "RETRIEVAL_CONTRACT_VIOLATION"
    };
  }

  const storageIdentity =
    buildFundamentalDocumentStorageIdentity({
      symbol,
      fiscalYear: year,
      filingType,
      source
    });

  return {
    eligible: true,
    reason:
      "VALIDATED_DOCUMENT_ELIGIBLE",

    storageIdentity,

    persistence:
      "ELIGIBLE_NOT_WRITTEN",

    authoritative:
      false,

    verified:
      false
  };
}

export default {
  evaluateFundamentalDocumentRetention
};
