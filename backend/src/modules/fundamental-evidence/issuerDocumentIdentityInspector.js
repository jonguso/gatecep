import {
  getDocument
} from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  getSecurityBySymbol
} from "../../data/nseSecurityMaster.js";

const MAX_IDENTITY_PAGES = 12;

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUpper(value) {
  return normalizeText(value)
    .toUpperCase();
}

async function extractIdentityText(
  documentBuffer
) {
  if (
    !documentBuffer ||
    !documentBuffer.length
  ) {
    throw new Error(
      "Issuer document buffer is required."
    );
  }

  const document =
    await getDocument({
      data:
        new Uint8Array(
          documentBuffer
        ),

      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    }).promise;

  const pageCount =
    document.numPages;

  const inspectedPageCount =
    Math.min(
      pageCount,
      MAX_IDENTITY_PAGES
    );

  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <=
      inspectedPageCount;
    pageNumber += 1
  ) {
    const page =
      await document.getPage(
        pageNumber
      );

    const content =
      await page.getTextContent();

    let pageText = "";

    for (
      const item of content.items
    ) {
      pageText +=
        `${item.str}${
          item.hasEOL
            ? "\n"
            : " "
        }`;
    }

    pages.push(pageText);
  }

  return {
    pageCount,
    inspectedPageCount,
    text:
      pages.join("\n")
  };
}

function detectIssuerIdentity({
  text,
  security
}) {
  const upper =
    normalizeUpper(text);

  const canonicalName =
    normalizeUpper(
      security?.name
    );

  const equityPatterns = [
    /EQUITY\s+GROUP\s+HOLDINGS\s+PLC/i,
    /EQUITY\s+GROUP\s+HOLDINGS/i
  ];

  let matchedText = null;

  if (
    security?.symbol === "EQT"
  ) {
    const match =
      equityPatterns.find(
        (pattern) =>
          pattern.test(text)
      );

    matchedText =
      match
        ? "Equity Group Holdings"
        : null;
  } else if (
    canonicalName &&
    upper.includes(canonicalName)
  ) {
    matchedText =
      security.name;
  }

  return {
    matched:
      Boolean(matchedText),

    matchedText
  };
}

function detectFilingType(text) {
  if (
    /AUDITED\s+FINANCIAL\s+STATEMENTS/i
      .test(text)
  ) {
    return {
      filingType:
        "AUDITED_FINANCIALS",

      evidence:
        "AUDITED FINANCIAL STATEMENTS"
    };
  }

  if (
    /(?:ANNUAL|INTEGRATED)\s+REPORT/i
      .test(text)
  ) {
    const match =
      text.match(
        /(?:ANNUAL|INTEGRATED)\s+REPORT/i
      );

    return {
      filingType:
        "ANNUAL_REPORT",

      evidence:
        normalizeText(
          match?.[0] || ""
        ).toUpperCase()
    };
  }

  if (
    /INTERIM\s+(?:FINANCIAL\s+)?REPORT/i
      .test(text)
  ) {
    return {
      filingType:
        "INTERIM_REPORT",

      evidence:
        "INTERIM REPORT"
    };
  }

  return {
    filingType: null,
    evidence: null
  };
}

function detectReportingPeriod(
  text
) {
  const patterns = [
    /(?:YEAR|PERIOD)\s+ENDED\s+31(?:ST)?\s+DECEMBER\s+(20\d{2})/i,
    /FOR\s+THE\s+YEAR\s+ENDED\s+31(?:ST)?\s+DECEMBER\s+(20\d{2})/i,
    /31(?:ST)?\s+DECEMBER\s+(20\d{2})/i
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      text.match(pattern);

    if (match) {
      return {
        fiscalYear:
          Number(match[1]),

        periodEnd:
          `${match[1]}-12-31`,

        evidence:
          normalizeText(
            match[0]
          )
      };
    }
  }

  return {
    fiscalYear: null,
    periodEnd: null,
    evidence: null
  };
}

export async function inspectIssuerDocumentIdentity({
  symbol,
  documentBuffer,
  retrieval = {}
} = {}) {
  const security =
    getSecurityBySymbol(symbol);

  if (!security) {
    throw new Error(
      "Canonical NSE security was not found."
    );
  }

  const extracted =
    await extractIdentityText(
      documentBuffer
    );

  const issuer =
    detectIssuerIdentity({
      text: extracted.text,
      security
    });

  const filing =
    detectFilingType(
      extracted.text
    );

  const period =
    detectReportingPeriod(
      extracted.text
    );

  const evidence = {
    issuerIdentity:
      issuer.matched,

    filingType:
      Boolean(
        filing.filingType
      ),

    reportingPeriod:
      Number.isInteger(
        period.fiscalYear
      )
  };

  const evidenceCount =
    Object.values(evidence)
      .filter(Boolean)
      .length;

  let identityStatus =
    "INSUFFICIENT_EVIDENCE";

  if (
    issuer.matched &&
    filing.filingType &&
    Number.isInteger(
      period.fiscalYear
    )
  ) {
    identityStatus =
      "IDENTIFIED";
  } else if (
    !issuer.matched &&
    (
      filing.filingType ||
      Number.isInteger(
        period.fiscalYear
      )
    )
  ) {
    identityStatus =
      "MISMATCH";
  }

  return {
    ok: true,

    inspectionOnly: true,
    persistence: "NONE",

    verifiedFiling: false,
    verified: false,
    authoritative: false,

    identityStatus,

    symbol:
      security.symbol,

    companyName:
      security.name,

    filingType:
      filing.filingType,

    fiscalYear:
      period.fiscalYear,

    periodEnd:
      period.periodEnd,

    pageCount:
      extracted.pageCount,

    inspectedPageCount:
      extracted
        .inspectedPageCount,

    evidenceCount,

    evidence: {
      issuer: {
        matched:
          issuer.matched,

        matchedText:
          issuer.matchedText
      },

      filingType: {
        matched:
          Boolean(
            filing.filingType
          ),

        matchedText:
          filing.evidence
      },

      reportingPeriod: {
        matched:
          Number.isInteger(
            period.fiscalYear
          ),

        matchedText:
          period.evidence
      }
    },

    sourceDocument: {
      fileName:
        retrieval.fileName ||
        null,

      fileUri:
        retrieval.finalUrl ||
        retrieval.requestedUrl ||
        null,

      mimeType:
        retrieval.contentType ||
        "application/pdf",

      pageCount:
        extracted.pageCount,

      checksum:
        retrieval.checksum ||
        null,

      source: {
        provider:
          retrieval.sourceType ||
          null,

        sourceType:
          retrieval.sourceType ||
          null,

        trustLevel:
          retrieval.trustLevel ||
          null,

        authoritative:
          false,

        verified:
          false,

        retrievedAt:
          retrieval.retrievedAt ||
          null
      }
    }
  };
}
