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

const STRONG_REPORTING_PERIOD_PATTERNS = [
  /(?:YEAR|PERIOD)\s+ENDED\s+(\d{1,2})(?:ST|ND|RD|TH)?\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(20\d{2})/i,
  /FOR\s+THE\s+YEAR\s+ENDED\s+(\d{1,2})(?:ST|ND|RD|TH)?\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(20\d{2})/i
];

const REPORTING_MONTHS =
  Object.freeze({
    JANUARY: 1,
    FEBRUARY: 2,
    MARCH: 3,
    APRIL: 4,
    MAY: 5,
    JUNE: 6,
    JULY: 7,
    AUGUST: 8,
    SEPTEMBER: 9,
    OCTOBER: 10,
    NOVEMBER: 11,
    DECEMBER: 12
  });

function isValidReportingDate({
  year,
  month,
  day
} = {}) {
  const candidate =
    new Date(
      Date.UTC(year, month - 1, day)
    );

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function detectReportingPeriod(
  text
) {
  const patterns = [
    ...STRONG_REPORTING_PERIOD_PATTERNS,
    /(\d{1,2})(?:ST|ND|RD|TH)?\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(20\d{2})/i
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      text.match(pattern);

    if (!match) {
      continue;
    }

    const day =
      Number(match[1]);

    const monthName =
      String(match[2] || "")
        .toUpperCase();

    const month =
      REPORTING_MONTHS[monthName];

    const fiscalYear =
      Number(match[3]);

    if (
      !Number.isInteger(month) ||
      !Number.isInteger(fiscalYear) ||
      !isValidReportingDate({
        year: fiscalYear,
        month,
        day
      })
    ) {
      continue;
    }

    return {
      fiscalYear,

      periodEnd:
        `${String(fiscalYear).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,

      evidence:
        normalizeText(
          match[0]
        )
    };
  }

  return {
    fiscalYear: null,
    periodEnd: null,
    evidence: null
  };
}

async function detectReportingPeriodFallback({
  documentBuffer,
  startPage,
  pageCount
} = {}) {
  if (
    !documentBuffer ||
    !documentBuffer.length ||
    !Number.isInteger(startPage) ||
    !Number.isInteger(pageCount) ||
    startPage > pageCount
  ) {
    return {
      fiscalYear: null,
      periodEnd: null,
      evidence: null,
      inspectedThroughPage:
        Math.max(
          0,
          Number(startPage || 1) - 1
        )
    };
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

  let inspectedThroughPage =
    startPage - 1;

  try {
    for (
      let pageNumber = startPage;
      pageNumber <= pageCount;
      pageNumber += 1
    ) {
      const page =
        await document.getPage(
          pageNumber
        );

      const content =
        await page.getTextContent();

      let pageText = "";

      for (const item of content.items) {
        pageText +=
          `${item.str}${
            item.hasEOL
              ? "\n"
              : " "
          }`;
      }

      inspectedThroughPage =
        pageNumber;

      for (
        const pattern of
          STRONG_REPORTING_PERIOD_PATTERNS
      ) {
        const match =
          pageText.match(pattern);

        if (!match) {
          continue;
        }

        const day =
          Number(match[1]);

        const monthName =
          String(match[2] || "")
            .toUpperCase();

        const month =
          REPORTING_MONTHS[
            monthName
          ];

        const fiscalYear =
          Number(match[3]);

        if (
          !Number.isInteger(month) ||
          !Number.isInteger(fiscalYear) ||
          !isValidReportingDate({
            year: fiscalYear,
            month,
            day
          })
        ) {
          continue;
        }

        return {
          fiscalYear,

          periodEnd:
            `${String(fiscalYear).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,

          evidence:
            normalizeText(
              match[0]
            ),

          inspectedThroughPage
        };
      }
    }

    return {
      fiscalYear: null,
      periodEnd: null,
      evidence: null,
      inspectedThroughPage
    };

  } finally {
    await document.destroy();
  }
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

  let period =
    detectReportingPeriod(
      extracted.text
    );

  let inspectedPageCount =
    extracted.inspectedPageCount;

  if (
    issuer.matched &&
    filing.filingType &&
    !Number.isInteger(
      period.fiscalYear
    ) &&
    extracted.inspectedPageCount <
      extracted.pageCount
  ) {
    const fallback =
      await detectReportingPeriodFallback({
        documentBuffer,
        startPage:
          extracted.inspectedPageCount + 1,
        pageCount:
          extracted.pageCount
      });

    inspectedPageCount =
      Math.max(
        inspectedPageCount,
        fallback.inspectedThroughPage
      );

    if (
      Number.isInteger(
        fallback.fiscalYear
      )
    ) {
      period = {
        fiscalYear:
          fallback.fiscalYear,

        periodEnd:
          fallback.periodEnd,

        evidence:
          fallback.evidence
      };
    }
  }

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

    inspectedPageCount,

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
