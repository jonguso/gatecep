import {
  getSecurityBySymbol
} from "../../data/nseSecurityMaster.js";

/*
 * PC-032G4B1C8G3D6F6D2
 *
 * Qualified issuer-document source registry.
 *
 * This authority is deliberately separate from the NSE security
 * master. A canonical NSE identity does not automatically establish
 * an issuer web domain.
 *
 * Hosts are added only after explicit qualification.
 */

const ISSUER_SOURCE_RULES = Object.freeze([
  {
    symbol: "EQT",
    issuerName: "Equity Group Holdings PLC",
    host: "equitygroupholdings.com",
    sourceType: "ISSUER",
    trustLevel: "OFFICIAL_ISSUER",
    authoritative: false,
    verified: false,
    qualificationStatus: "QUALIFIED"
  },
  {
    symbol: "EQT",
    issuerName: "Equity Group Holdings PLC",
    host: "annualreport.cma.or.ke",
    sourceType: "REGULATOR",
    trustLevel: "OFFICIAL_REGULATOR_REPOSITORY",
    authoritative: false,
    verified: false,
    qualificationStatus: "QUALIFIED"
  }
]);

function normalizeHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function normalizeSymbol(value) {
  const security =
    getSecurityBySymbol(value);

  return String(
    security?.symbol || ""
  )
    .trim()
    .toUpperCase();
}

export function listIssuerEvidenceSources(
  symbol
) {
  const canonicalSymbol =
    normalizeSymbol(symbol);

  if (!canonicalSymbol) {
    return [];
  }

  return ISSUER_SOURCE_RULES.filter(
    (item) =>
      item.symbol === canonicalSymbol
  );
}

export function resolveIssuerEvidenceSource({
  symbol,
  hostname
} = {}) {
  const canonicalSymbol =
    normalizeSymbol(symbol);

  const normalizedHost =
    normalizeHost(hostname);

  if (
    !canonicalSymbol ||
    !normalizedHost
  ) {
    return null;
  }

  return (
    ISSUER_SOURCE_RULES.find(
      (item) =>
        item.symbol ===
          canonicalSymbol &&
        (
          normalizedHost ===
            item.host ||
          normalizedHost.endsWith(
            `.${item.host}`
          )
        )
    ) ||
    null
  );
}

export function isQualifiedIssuerHost({
  symbol,
  hostname
} = {}) {
  return Boolean(
    resolveIssuerEvidenceSource({
      symbol,
      hostname
    })
  );
}

export {
  ISSUER_SOURCE_RULES
};
