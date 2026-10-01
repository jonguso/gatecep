import {
  getDocument
} from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  getSecurityBySymbol
} from "../../data/nseSecurityMaster.js";

/*
 * ============================================================
 * ISSUER FINANCIAL STATEMENT EVIDENCE EXTRACTOR
 * ============================================================
 *
 * PURPOSE
 * -------
 * Read-only extraction boundary:
 *
 *   IDENTIFIED issuer/regulator PDF
 *                |
 *                v
 *   financial statement evidence
 *                |
 *                v
 *   existing PC-025 structured extraction contract
 *
 * This module does NOT:
 *
 * - retrieve documents,
 * - persist evidence,
 * - create filings,
 * - submit filings,
 * - verify filings,
 * - approve filings,
 * - promote fundamentals,
 * - mutate REAL portfolios,
 * - mutate Practice portfolios.
 *
 * Extracted evidence is NOT verified merely because it came
 * from an identified issuer/regulator document.
 * ============================================================
 */

const MAX_EXTRACTION_PAGES = 320;

export const FINANCIAL_EXTRACTION_POLICIES =
  Object.freeze({
    GENERIC: "GENERIC",
    BANKING: "BANKING"
  });

const EMPTY_CANONICAL_PERIOD =
  Object.freeze({
    revenue: null,
    grossProfit: null,
    operatingIncome: null,
    ebitda: null,
    netIncome: null,

    totalAssets: null,
    totalLiabilities: null,
    totalEquity: null,
    cashAndEquivalents: null,
    totalDebt: null,
    currentAssets: null,
    currentLiabilities: null,

    operatingCashFlow: null,
    capitalExpenditure: null,
    freeCashFlow: null,

    sharesOutstanding: null,
    earningsPerShare: null,
    bookValuePerShare: null,
    revenuePerShare: null,
    freeCashFlowPerShare: null,
    dividendPerShare: null
  });

const BANKING_FIELD_POLICY =
  Object.freeze({
    /*
     * Banking statements do not map cleanly onto a generic
     * industrial-company income statement.
     *
     * Do not manufacture generic values from banking-specific
     * concepts without a later explicit reviewed mapping policy.
     */

    directlySupported: Object.freeze([
      "netIncome",
      "totalAssets",
      "totalLiabilities",
      "totalEquity",
      "cashAndEquivalents",
      "operatingCashFlow",
      "sharesOutstanding",
      "earningsPerShare",
      "bookValuePerShare",
      "dividendPerShare"
    ]),

    preserveNullWithoutExplicitPolicy:
      Object.freeze([
        "revenue",
        "grossProfit",
        "operatingIncome",
        "ebitda",
        "totalDebt",
        "currentAssets",
        "currentLiabilities",
        "capitalExpenditure",
        "freeCashFlow",
        "revenuePerShare",
        "freeCashFlowPerShare"
      ])
  });

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function cloneEmptyCanonicalPeriod() {
  return {
    ...EMPTY_CANONICAL_PERIOD
  };
}

function resolveExtractionPolicy({
  security
} = {}) {
  const sector =
    normalizeText(
      security?.sector
    ).toUpperCase();

  const industry =
    normalizeText(
      security?.industry ||
      security?.subsector
    ).toUpperCase();

  const combined =
    `${sector} ${industry}`;

  if (
    /\bBANK(?:ING)?\b/.test(
      combined
    )
  ) {
    return (
      FINANCIAL_EXTRACTION_POLICIES
        .BANKING
    );
  }

  return (
    FINANCIAL_EXTRACTION_POLICIES
      .GENERIC
  );
}

async function extractPdfPages(
  documentBuffer,
  {
    maxPages =
      MAX_EXTRACTION_PAGES
  } = {}
) {
  if (
    !Buffer.isBuffer(
      documentBuffer
    ) &&
    !(
      documentBuffer instanceof
      Uint8Array
    )
  ) {
    throw new TypeError(
      "documentBuffer must be a Buffer or Uint8Array."
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
      maxPages
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

    const lines = [];
    let currentLine = "";

    for (
      const item of
      content.items || []
    ) {
      const value =
        normalizeText(
          item?.str
        );

      if (value) {
        currentLine +=
          (
            currentLine
              ? " "
              : ""
          ) +
          value;
      }

      if (item?.hasEOL) {
        if (
          normalizeText(
            currentLine
          )
        ) {
          lines.push(
            normalizeText(
              currentLine
            )
          );
        }

        currentLine = "";
      }
    }

    if (
      normalizeText(
        currentLine
      )
    ) {
      lines.push(
        normalizeText(
          currentLine
        )
      );
    }

    pages.push({
      pageNumber,
      text:
        lines.join("\n")
    });
  }

  return {
    pageCount,
    inspectedPageCount,
    pages
  };
}

/*
 * Parse one financial token only.
 *
 * Supported examples:
 *
 *   1,970,991
 *   (46,699)
 *   19.07
 *   -
 *
 * The parser does not infer scale. Statement-level mapping
 * supplies the unit multiplier separately.
 */
function parseFinancialNumber(
  rawValue
) {
  const raw =
    normalizeText(
      rawValue
    );

  if (
    !raw ||
    raw === "-" ||
    raw === "--"
  ) {
    return null;
  }

  const negative =
    /^\(.*\)$/.test(
      raw
    );

  const normalized =
    raw
      .replace(/[(),]/g, "")
      .trim();

  if (
    !/^-?\d+(?:\.\d+)?$/.test(
      normalized
    )
  ) {
    return null;
  }

  const numeric =
    Number(normalized);

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return null;
  }

  return negative
    ? -Math.abs(numeric)
    : numeric;
}

/*
 * Parse the trailing current/comparative values from a
 * PDFJS financial-statement row.
 *
 * We deliberately parse from the right because note references
 * can contain numeric tokens such as:
 *
 *   21 (a)
 *   16(c)
 *   31(g)
 *   34
 *
 * The final two numeric tokens are the current and comparative
 * statement values for the row structures qualified in D6F6D6F.
 */
function parseTrailingComparativeValues(
  line
) {
  const text =
    normalizeText(
      line
    );

  const matches =
    [
      ...text.matchAll(
        /(?:^|\s)(\(?-?[\d,]+(?:\.\d+)?\)?)(?=\s|$)/g
      )
    ];

  if (
    matches.length < 2
  ) {
    return null;
  }

  const currentToken =
    matches[
      matches.length - 2
    ]?.[1];

  const comparativeToken =
    matches[
      matches.length - 1
    ]?.[1];

  const current =
    parseFinancialNumber(
      currentToken
    );

  const comparative =
    parseFinancialNumber(
      comparativeToken
    );

  if (
    current === null ||
    comparative === null
  ) {
    return null;
  }

  return {
    current,
    comparative,
    currentToken,
    comparativeToken
  };
}

export const
__financialStatementParserTestHooks =
  Object.freeze({
    parseFinancialNumber,
    parseTrailingComparativeValues,
    findExactFinancialRow:
      (...args) =>
        findExactFinancialRow(
          ...args
        )
  });

const BANKING_DIRECT_FIELD_MAPPINGS =
  Object.freeze([
    Object.freeze({
      field: "netIncome",
      pageNumber: 141,
      statement:
        "CONSOLIDATED STATEMENT OF PROFIT OR LOSS",
      label:
        "Profit for the year",
      unit: "KES_MILLIONS",
      multiplier: 1_000_000
    }),

    Object.freeze({
      field: "totalAssets",
      pageNumber: 144,
      statement:
        "CONSOLIDATED STATEMENT OF FINANCIAL POSITION",
      label:
        "Total assets",
      unit: "KES_MILLIONS",
      multiplier: 1_000_000
    }),

    Object.freeze({
      field: "totalLiabilities",
      pageNumber: 144,
      statement:
        "CONSOLIDATED STATEMENT OF FINANCIAL POSITION",
      label:
        "Total liabilities",
      unit: "KES_MILLIONS",
      multiplier: 1_000_000
    }),

    Object.freeze({
      field: "totalEquity",
      pageNumber: 144,
      statement:
        "CONSOLIDATED STATEMENT OF FINANCIAL POSITION",
      label:
        "Total equity",
      unit: "KES_MILLIONS",
      multiplier: 1_000_000
    }),

    Object.freeze({
      field: "cashAndEquivalents",
      pageNumber: 149,
      statement:
        "CONSOLIDATED STATEMENT OF CASH FLOWS",
      label:
        "Cash and cash equivalents at end of year",
      unit: "KES_MILLIONS",
      multiplier: 1_000_000
    }),

    Object.freeze({
      field: "operatingCashFlow",
      pageNumber: 149,
      statement:
        "CONSOLIDATED STATEMENT OF CASH FLOWS",
      label:
        "Net cash flows from operating activities",
      unit: "KES_MILLIONS",
      multiplier: 1_000_000
    }),

    Object.freeze({
      field: "earningsPerShare",
      pageNumber: 141,
      statement:
        "CONSOLIDATED STATEMENT OF PROFIT OR LOSS",
      label:
        "Earnings per share (basic and diluted)",
      unit: "KES_PER_SHARE",
      multiplier: 1
    })
  ]);

function findExactFinancialRow(
  pageText,
  label
) {
  const normalizedLabel =
    normalizeText(
      label
    ).toLowerCase();

  const lines =
    String(pageText || "")
      .split("\n")
      .map(normalizeText)
      .filter(Boolean);

  const matches =
    lines.filter(
      (line) => {
        const normalizedLine =
          line.toLowerCase();

        if (
          normalizedLine ===
            normalizedLabel
        ) {
          return true;
        }

        if (
          !normalizedLine.startsWith(
            `${normalizedLabel} `
          )
        ) {
          return false;
        }

        /*
         * A financial row may continue with:
         *
         * - a numeric value,
         * - a parenthesized numeric value,
         * - a numeric note reference such as 21(a), 31(g), or 34.
         *
         * It must NOT continue with another descriptive word.
         *
         * This prevents:
         *
         *   "Total equity"
         *
         * from also matching:
         *
         *   "Total equity and liabilities ..."
         */
        const remainder =
          normalizedLine
            .slice(
              normalizedLabel.length
            )
            .trim();

        const numericBoundary =
          /^\(?-?\d/.test(
            remainder
          );

        /*
         * Per-share statement rows may carry an explicit
         * currency/unit marker immediately after the label.
         *
         * Keep this allow-list deliberately narrow. We must
         * not permit arbitrary descriptive words because that
         * would reintroduce prefix collisions such as:
         *
         *   Total equity
         *   Total equity and liabilities
         */
        const permittedUnitBoundary =
          /^\(shs\)(?:\s|$)/i.test(
            remainder
          );

        return (
          numericBoundary ||
          permittedUnitBoundary
        );
      }
    );

  if (
    matches.length !== 1
  ) {
    return {
      ok: false,
      matchCount:
        matches.length,
      line: null
    };
  }

  return {
    ok: true,
    matchCount: 1,
    line:
      matches[0]
  };
}

function extractBankingOwnerProfitEvidence({
  pages
} = {}) {
  const pageNumber = 141;

  const page =
    (pages || []).find(
      (candidate) =>
        candidate.pageNumber ===
        pageNumber
    );

  if (!page) {
    throw new Error(
      "Required owner-profit evidence page 141 is unavailable."
    );
  }

  const matched =
    findExactFinancialRow(
      page.text,
      "- Owners of the parent company"
    );

  if (
    !matched?.ok ||
    matched.matchCount !== 1 ||
    !matched.line
  ) {
    throw new Error(
      `Expected exactly one owner-profit disclosure; found ${matched?.matchCount ?? 0}.`
    );
  }

  const parsed =
    parseTrailingComparativeValues(
      matched.line
    );

  if (
    !parsed ||
    parsed.current === null ||
    parsed.comparative === null
  ) {
    throw new Error(
      "Owner-profit evidence could not be parsed."
    );
  }

  return {
    current:
      parsed.current *
      1_000_000,

    comparative:
      parsed.comparative *
      1_000_000,

    evidence: {
      ...buildEvidenceRecord({
        field:
          "profitAttributableToOwners",

        value:
          parsed.current *
          1_000_000,

        pageNumber,

        statement:
          "CONSOLIDATED STATEMENT OF PROFIT OR LOSS",

        matchedText:
          matched.line,

        extractionMethod:
          "DETERMINISTIC_PDF_TEXT_ROW",

        confidence:
          "HIGH"
      }),

      sourceUnit:
        "KES_MILLIONS",

      sourceMultiplier:
        1_000_000,

      sourceValue:
        parsed.current,

      comparativeSourceValue:
        parsed.comparative,

      comparativeValue:
        parsed.comparative *
        1_000_000,

      accountingScope:
        "ATTRIBUTABLE_TO_OWNERS"
    }
  };
}

function extractBankingOwnerEquityEvidence({
  pages
} = {}) {
  const pageNumber = 144;

  const page =
    (pages || []).find(
      (candidate) =>
        candidate.pageNumber ===
        pageNumber
    );

  if (!page) {
    throw new Error(
      "Required owner-equity evidence page 144 is unavailable."
    );
  }

  const matched =
    findExactFinancialRow(
      page.text,
      "Equity attributable to owners of the Company"
    );

  if (
    !matched?.ok ||
    matched.matchCount !== 1 ||
    !matched.line
  ) {
    throw new Error(
      `Expected exactly one owner-equity disclosure; found ${matched?.matchCount ?? 0}.`
    );
  }

  const parsed =
    parseTrailingComparativeValues(
      matched.line
    );

  if (
    !parsed ||
    parsed.current === null ||
    parsed.comparative === null
  ) {
    throw new Error(
      "Owner-equity evidence could not be parsed."
    );
  }

  return {
    current:
      parsed.current *
      1_000_000,

    comparative:
      parsed.comparative *
      1_000_000,

    evidence: {
      ...buildEvidenceRecord({
        field:
          "equityAttributableToOwners",

        value:
          parsed.current *
          1_000_000,

        pageNumber,

        statement:
          "CONSOLIDATED STATEMENT OF FINANCIAL POSITION",

        matchedText:
          matched.line,

        extractionMethod:
          "DETERMINISTIC_PDF_TEXT_ROW",

        confidence:
          "HIGH"
      }),

      sourceUnit:
        "KES_MILLIONS",

      sourceMultiplier:
        1_000_000,

      sourceValue:
        parsed.current,

      comparativeSourceValue:
        parsed.comparative,

      comparativeValue:
        parsed.comparative *
        1_000_000,

      accountingScope:
        "ATTRIBUTABLE_TO_OWNERS"
    }
  };
}

function extractIssuedFullyPaidOrdinaryShares({
  pages
} = {}) {
  const pageNumber = 246;

  const page =
    (pages || []).find(
      (candidate) =>
        candidate.pageNumber ===
        pageNumber
    );

  if (!page) {
    throw new Error(
      "Required share-capital evidence page 246 is unavailable."
    );
  }

  const lines =
    String(page.text || "")
      .split("\n")
      .map(normalizeText)
      .filter(Boolean);

  /*
   * The qualified Equity FY2025 report linearizes the disclosure
   * across two adjacent PDFJS lines:
   *
   *   Issued and fully paid - 3,773,674,802 (2024:
   *   3,773,674,802) ordinary shares of Shs 0.5 each
   *
   * Join adjacent lines only for this explicit semantic contract.
   */
  const candidates = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const current =
      lines[index];

    if (
      !/^Issued and fully paid\b/i.test(
        current
      )
    ) {
      continue;
    }

    const combined =
      normalizeText(
        `${current} ${lines[index + 1] || ""}`
      );

    const match =
      combined.match(
        /^Issued and fully paid\s*-\s*([\d,]+)\s*\(2024:\s*([\d,]+)\)\s*ordinary shares of Shs\s*0\.5 each$/i
      );

    if (!match) {
      continue;
    }

    candidates.push({
      matchedText:
        combined,

      currentToken:
        match[1],

      comparativeToken:
        match[2]
    });
  }

  if (
    candidates.length !== 1
  ) {
    throw new Error(
      `Expected exactly one issued-and-fully-paid ordinary-share disclosure; found ${candidates.length}.`
    );
  }

  const candidate =
    candidates[0];

  const current =
    parseFinancialNumber(
      candidate.currentToken
    );

  const comparative =
    parseFinancialNumber(
      candidate.comparativeToken
    );

  if (
    current === null ||
    comparative === null ||
    !Number.isInteger(current) ||
    !Number.isInteger(comparative) ||
    current <= 0 ||
    comparative <= 0
  ) {
    throw new Error(
      "Issued-and-fully-paid ordinary-share evidence is invalid."
    );
  }

  return {
    field:
      "sharesOutstanding",

    value:
      current,

    comparativeValue:
      comparative,

    evidence: {
      ...buildEvidenceRecord({
        field:
          "sharesOutstanding",

        value:
          current,

        pageNumber,

        statement:
          "31 SHARE CAPITAL AND RESERVES",

        matchedText:
          candidate.matchedText,

        extractionMethod:
          "DETERMINISTIC_ISSUED_FULLY_PAID_SHARE_DISCLOSURE",

        confidence:
          "HIGH"
      }),

      sourceUnit:
        "ORDINARY_SHARES",

      sourceMultiplier:
        1,

      sourceValue:
        current,

      comparativeSourceValue:
        comparative,

      comparativeValue:
        comparative,

      currentToken:
        candidate.currentToken,

      comparativeToken:
        candidate.comparativeToken,

      shareClass:
        "ORDINARY",

      shareCapitalStatus:
        "ISSUED_AND_FULLY_PAID",

      parValue:
        0.5,

      parValueCurrency:
        "KES"
    }
  };
}

function extractBankingDirectEvidence({
  pages
} = {}) {
  const periodValues = {};
  const evidence = [];

  for (
    const mapping of
    BANKING_DIRECT_FIELD_MAPPINGS
  ) {
    const page =
      (pages || []).find(
        (candidate) =>
          candidate.pageNumber ===
          mapping.pageNumber
      );

    if (!page) {
      throw new Error(
        `Required banking evidence page ${mapping.pageNumber} is unavailable.`
      );
    }

    const row =
      findExactFinancialRow(
        page.text,
        mapping.label
      );

    if (!row.ok) {
      throw new Error(
        `Expected exactly one row for ${mapping.field}; found ${row.matchCount}.`
      );
    }

    const parsed =
      parseTrailingComparativeValues(
        row.line
      );

    if (!parsed) {
      throw new Error(
        `Unable to parse current/comparative values for ${mapping.field}.`
      );
    }

    const scaledCurrent =
      parsed.current *
      mapping.multiplier;

    const scaledComparative =
      parsed.comparative *
      mapping.multiplier;

    periodValues[
      mapping.field
    ] =
      scaledCurrent;

    evidence.push({
      ...buildEvidenceRecord({
        field:
          mapping.field,

        value:
          scaledCurrent,

        pageNumber:
          mapping.pageNumber,

        statement:
          mapping.statement,

        matchedText:
          row.line,

        extractionMethod:
          "DETERMINISTIC_PDF_TEXT_ROW",

        confidence:
          "HIGH"
      }),

      sourceUnit:
        mapping.unit,

      sourceMultiplier:
        mapping.multiplier,

      sourceValue:
        parsed.current,

      comparativeSourceValue:
        parsed.comparative,

      comparativeValue:
        scaledComparative,

      currentToken:
        parsed.currentToken,

      comparativeToken:
        parsed.comparativeToken
    });
  }

  return {
    periodValues,
    evidence
  };
}

function buildEvidenceRecord({
  field,
  value = null,
  pageNumber = null,
  statement = null,
  matchedText = null,
  extractionMethod =
    "PDF_TEXT",
  confidence =
    "UNASSESSED"
} = {}) {
  return {
    field:
      normalizeText(field),

    value,

    pageNumber,

    statement:
      statement
        ? normalizeText(
            statement
          )
        : null,

    matchedText:
      matchedText
        ? normalizeText(
            matchedText
          )
        : null,

    extractionMethod,

    confidence,

    verified: false,
    authoritative: false
  };
}

/*
 * This foundation deliberately does not guess financial
 * values from arbitrary numeric PDF text.
 *
 * Later gates add evidence-backed statement locators and
 * field parsers one statement family at a time.
 */
function buildInitialExtractionResult({
  fiscalYear,
  periodEnd,
  currency = "KES"
} = {}) {
  return {
    fiscalYear:
      fiscalYear ?? null,

    periodType:
      "ANNUAL",

    periodStart: null,

    periodEnd:
      periodEnd || null,

    currency:
      normalizeSymbol(
        currency || "KES"
      ),

    ...cloneEmptyCanonicalPeriod()
  };
}

export async function
extractIssuerFinancialStatementEvidence({
  symbol,
  documentBuffer,
  identity,
  retrieval = {},
  maxPages =
    MAX_EXTRACTION_PAGES
} = {}) {
  const security =
    getSecurityBySymbol(
      symbol
    );

  if (!security) {
    throw new Error(
      "Unknown canonical NSE security."
    );
  }

  if (
    identity?.identityStatus !==
      "IDENTIFIED"
  ) {
    throw new Error(
      "Financial extraction requires an IDENTIFIED document."
    );
  }

  if (
    normalizeSymbol(
      identity?.symbol
    ) !==
    normalizeSymbol(
      security.symbol
    )
  ) {
    throw new Error(
      "Document identity does not match canonical security."
    );
  }

  const pdf =
    await extractPdfPages(
      documentBuffer,
      {
        maxPages
      }
    );

  const policy =
    resolveExtractionPolicy({
      security
    });

  const period =
    buildInitialExtractionResult({
      fiscalYear:
        identity?.fiscalYear,

      periodEnd:
        identity?.periodEnd,

      currency: "KES"
    });

  let extractedEvidence = [];

  if (
    policy ===
      FINANCIAL_EXTRACTION_POLICIES
        .BANKING
  ) {
    const bankingEvidence =
      extractBankingDirectEvidence({
        pages:
          pdf.pages
      });

    Object.assign(
      period,
      bankingEvidence.periodValues
    );

    const shareEvidence =
      extractIssuedFullyPaidOrdinaryShares({
        pages:
          pdf.pages
      });

    period[
      shareEvidence.field
    ] =
      shareEvidence.value;

    const ownerEquityEvidence =
      extractBankingOwnerEquityEvidence({
        pages:
          pdf.pages
      });

    /*
     * BANKING-SPECIFIC REVIEWED SEMANTIC POLICY:
     *
     * Book value per ordinary share uses equity attributable
     * to owners, not consolidated total equity that includes
     * non-controlling interests.
     */
    period.bookValuePerShare =
      ownerEquityEvidence.current /
      shareEvidence.value;

    const ownerProfitEvidence =
      extractBankingOwnerProfitEvidence({
        pages:
          pdf.pages
      });

    /*
     * BANKING-SPECIFIC REVIEWED SEMANTIC POLICY:
     *
     * Shareholder ROE pairs profit attributable to owners
     * with average equity attributable to owners.
     *
     * Comparative owner equity is the beginning balance
     * for the current fiscal year; current owner equity is
     * the ending balance.
     */
    const averageOwnerEquity =
      (
        ownerEquityEvidence.comparative +
        ownerEquityEvidence.current
      ) /
      2;

    period.returnOnEquityPercentage =
      averageOwnerEquity !== 0
        ? (
            ownerProfitEvidence.current /
            averageOwnerEquity
          ) *
          100
        : null;

    extractedEvidence = [
      ...bankingEvidence.evidence,
      shareEvidence.evidence,
      ownerEquityEvidence.evidence,
      ownerProfitEvidence.evidence,
      {
        ...buildEvidenceRecord({
          field:
            "bookValuePerShare",

          value:
            period.bookValuePerShare,

          pageNumber:
            ownerEquityEvidence.evidence
              .pageNumber,

          statement:
            "BANKING OWNER-EQUITY DERIVATION",

          matchedText:
            ownerEquityEvidence.evidence
              .matchedText,

          extractionMethod:
            "DERIVED_FROM_OWNER_EQUITY_AND_EXACT_ORDINARY_SHARES",

          confidence:
            "HIGH"
        }),

        numeratorField:
          "equityAttributableToOwners",

        numerator:
          ownerEquityEvidence.current,

        denominatorField:
          "sharesOutstanding",

        denominator:
          shareEvidence.value,

        accountingScope:
          "ATTRIBUTABLE_TO_OWNERS"
      },
      {
        ...buildEvidenceRecord({
          field:
            "returnOnEquityPercentage",

          value:
            period.returnOnEquityPercentage,

          pageNumber:
            ownerProfitEvidence.evidence
              .pageNumber,

          statement:
            "BANKING OWNER-ATTRIBUTABLE ROE DERIVATION",

          matchedText:
            ownerProfitEvidence.evidence
              .matchedText,

          extractionMethod:
            "DERIVED_FROM_OWNER_PROFIT_AND_AVERAGE_OWNER_EQUITY",

          confidence:
            "HIGH"
        }),

        numeratorField:
          "profitAttributableToOwners",

        numerator:
          ownerProfitEvidence.current,

        denominatorField:
          "averageEquityAttributableToOwners",

        denominator:
          averageOwnerEquity,

        beginningOwnerEquity:
          ownerEquityEvidence.comparative,

        endingOwnerEquity:
          ownerEquityEvidence.current,

        accountingScope:
          "ATTRIBUTABLE_TO_OWNERS",

        denominatorConvention:
          "AVERAGE_BEGINNING_ENDING_EQUITY"
      }
    ];
  }

  return {
    ok: true,

    extractionStatus:
      extractedEvidence.length
        ? "EVIDENCE_EXTRACTED"
        : "FOUNDATION_ONLY",

    extractionOnly: true,
    persistence: "NONE",

    verifiedFiling: false,
    verified: false,
    authoritative: false,

    symbol:
      security.symbol,

    companyName:
      security.name,

    sector:
      security.sector ||
      null,

    extractionPolicy:
      policy,

    filingType:
      identity?.filingType ||
      null,

    fiscalYear:
      identity?.fiscalYear ??
      null,

    periodEnd:
      identity?.periodEnd ||
      null,

    pageCount:
      pdf.pageCount,

    inspectedPageCount:
      pdf.inspectedPageCount,

    /*
     * Page text is transient extraction evidence.
     * It is not persisted and is not filing authority.
     */
    pages:
      pdf.pages,

    periods: [
      period
    ],

    evidence:
      extractedEvidence,

    evidenceCount:
      extractedEvidence.length,

    bankingPolicy:
      policy ===
        FINANCIAL_EXTRACTION_POLICIES
          .BANKING
        ? BANKING_FIELD_POLICY
        : null,

    sourceDocument: {
      fileName:
        retrieval?.finalUrl
          ? decodeURIComponent(
              String(
                retrieval.finalUrl
              )
                .split("/")
                .pop() || ""
            )
          : null,

      fileUri:
        retrieval?.finalUrl ||
        null,

      mimeType:
        retrieval?.contentType ||
        null,

      pageCount:
        pdf.pageCount,

      checksum:
        retrieval?.checksum ||
        null,

      source: {
        provider:
          retrieval?.hostname ||
          null,

        sourceType:
          retrieval?.sourceType ||
          null,

        trustLevel:
          retrieval?.trustLevel ||
          null,

        authoritative: false,
        verified: false,

        retrievedAt:
          retrieval?.retrievedAt ||
          null
      }
    },

    evidenceContract: {
      fields:
        Object.keys(
          EMPTY_CANONICAL_PERIOD
        ),

      recordShape:
        buildEvidenceRecord({
          field:
            "exampleField"
        })
    }
  };
}
