/*
 * PC-032G4B1C8G3D6F6D6G5D6A
 *
 * Issuer financial evidence preview orchestration.
 *
 * Retrieval -> identity inspection -> financial extraction.
 *
 * Preview only:
 * - no persistence
 * - no filing lifecycle mutation
 * - no verification / approval / promotion
 * - raw document bytes never leave this service
 */

import {
  retrieveIssuerDocument
} from "./issuerDocumentRetriever.js";

import {
  inspectIssuerDocumentIdentity
} from "./issuerDocumentIdentityInspector.js";

import {
  extractIssuerFinancialStatementEvidence
} from "./issuerFinancialStatementEvidenceExtractor.js";

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeUrl(value) {
  return String(value || "")
    .trim();
}

export async function previewIssuerFinancialEvidence({
  symbol,
  url
} = {}) {
  const canonicalSymbol =
    normalizeSymbol(symbol);

  const sourceUrl =
    normalizeUrl(url);

  if (!canonicalSymbol) {
    throw new Error(
      "A canonical NSE security symbol is required."
    );
  }

  if (!sourceUrl) {
    throw new Error(
      "An issuer or regulator document URL is required."
    );
  }

  const retrieval =
    await retrieveIssuerDocument({
      symbol: canonicalSymbol,
      url: sourceUrl
    });

  if (
    retrieval?.persistence !== "NONE" ||
    retrieval?.verifiedFiling !== false ||
    retrieval?.verified === true ||
    retrieval?.authoritative === true
  ) {
    throw new Error(
      "Issuer document retrieval violated the preview-only evidence contract."
    );
  }

  const identity =
    await inspectIssuerDocumentIdentity({
      symbol: canonicalSymbol,
      documentBuffer:
        retrieval.documentBuffer,
      retrieval
    });

  if (
    identity?.persistence !== "NONE" ||
    identity?.verifiedFiling !== false ||
    identity?.verified === true ||
    identity?.authoritative === true
  ) {
    throw new Error(
      "Issuer document identity inspection violated the preview-only evidence contract."
    );
  }

  const extraction =
    await extractIssuerFinancialStatementEvidence({
      symbol: canonicalSymbol,
      documentBuffer:
        retrieval.documentBuffer,
      identity,
      retrieval
    });

  if (
    extraction?.extractionOnly !== true ||
    extraction?.persistence !== "NONE" ||
    extraction?.verifiedFiling !== false ||
    extraction?.verified === true ||
    extraction?.authoritative === true
  ) {
    throw new Error(
      "Issuer financial extraction violated the preview-only evidence contract."
    );
  }

  /*
   * Deliberately construct the response rather than spreading
   * retrieval. documentBuffer must remain server-internal.
   */
  return {
    ok: true,

    previewOnly: true,
    extractionOnly: true,
    persistence: "NONE",

    verifiedFiling: false,
    verified: false,
    authoritative: false,

    identityStatus:
      identity.identityStatus,

    symbol:
      extraction.symbol,

    companyName:
      extraction.companyName,

    sector:
      extraction.sector,

    extractionPolicy:
      extraction.extractionPolicy,

    filingType:
      extraction.filingType,

    fiscalYear:
      extraction.fiscalYear,

    periodEnd:
      extraction.periodEnd,

    extractionStatus:
      extraction.extractionStatus,

    periods:
      Array.isArray(extraction.periods)
        ? extraction.periods
        : [],

    evidence:
      Array.isArray(extraction.evidence)
        ? extraction.evidence
        : [],

    sourceDocument:
      extraction.sourceDocument ||
      identity.sourceDocument ||
      null
  };
}

export default {
  previewIssuerFinancialEvidence
};
