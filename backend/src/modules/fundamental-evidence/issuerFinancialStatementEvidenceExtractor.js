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
    parseGenericGroupCompanyComparativeValues,
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

export function extractGenericExactIssuedOrdinaryShares({
  pages
} = {}) {
  const candidates = [];

  for (const page of pages || []) {
    const lines =
      String(page?.text || "")
        .split("\n")
        .map(normalizeText)
        .filter(Boolean);

    /*
     * Join a small bounded window because PDFJS may linearize
     * the issuer disclosure across adjacent lines.
     *
     * Qualified semantic contract:
     *
     *   issued share capital comprises
     *   40,065,428,000 ... ordinary shares
     *
     * The count must be an explicit integer share count.
     * Rounded "million shares" disclosures are intentionally
     * excluded from this exact-evidence path.
     */
    for (
      let index = 0;
      index < lines.length;
      index += 1
    ) {
      const combined =
        normalizeText(
          [
            lines[index],
            lines[index + 1] || "",
            lines[index + 2] || "",
            lines[index + 3] || ""
          ].join(" ")
        );

      if (
        !/\bissued share capital comprises\b/i.test(
          combined
        )
      ) {
        continue;
      }

      const match =
        combined.match(
          /\bissued share capital comprises\s+([\d,]+)(?:\s*\([^)]*\))?[\s\S]{0,220}?\bordinary shares\b/i
        );

      if (!match) {
        continue;
      }

      const token =
        match[1];

      const value =
        parseFinancialNumber(
          token
        );

      if (
        value === null ||
        !Number.isInteger(value) ||
        value <= 0
      ) {
        continue;
      }

      candidates.push({
        pageNumber:
          page.pageNumber,
        matchedText:
          combined,
        token,
        value
      });
    }
  }

  /*
   * PDFJS line windows can encounter the same disclosure more
   * than once on one page. Collapse identical evidence before
   * enforcing the fail-closed uniqueness contract.
   */
  const unique =
    [
      ...new Map(
        candidates.map(candidate => [
          [
            candidate.pageNumber,
            candidate.value
          ].join(":"),
          candidate
        ])
      ).values()
    ];

  if (unique.length === 0) {
    return null;
  }

  if (unique.length !== 1) {
    throw new Error(
      `Expected at most one exact issued ordinary-share disclosure; found ${unique.length}.`
    );
  }

  const candidate =
    unique[0];

  return {
    field:
      "sharesOutstanding",

    value:
      candidate.value,

    evidence: {
      ...buildEvidenceRecord({
        field:
          "sharesOutstanding",

        value:
          candidate.value,

        pageNumber:
          candidate.pageNumber,

        statement:
          "SHARE CAPITAL",

        matchedText:
          candidate.matchedText,

        extractionMethod:
          "DETERMINISTIC_EXACT_ISSUED_ORDINARY_SHARE_DISCLOSURE",

        confidence:
          "HIGH"
      }),

      sourceUnit:
        "ORDINARY_SHARES",

      sourceMultiplier:
        1,

      sourceValue:
        candidate.value,

      sourceToken:
        candidate.token,

      shareClass:
        "ORDINARY",

      shareCapitalStatus:
        "ISSUED",

      exactIssuerDisclosure:
        true
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


function normalizeBankingSemanticText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function bankingPageLines(page) {
  const source =
    Array.isArray(page?.lines)
      ? page.lines
      : String(page?.text || "")
          .split(/\r?\n/);

  return source
    .map(normalizeBankingSemanticText)
    .filter(Boolean);
}

function bankingPageContainsHeading(
  page,
  headingPattern
) {
  return bankingPageLines(page)
    .some(line =>
      headingPattern.test(line)
    );
}

function findBankingStatementPage(
  pages,
  {
    headingPattern,
    requiredRowPatterns = []
  }
) {
  const matches =
    (pages || []).filter(page => {
      const lines =
        bankingPageLines(page);

      const hasHeading =
        lines.some(line =>
          headingPattern.test(line)
        );

      if (!hasHeading) {
        return false;
      }

      return requiredRowPatterns.every(
        pattern =>
          lines.some(line =>
            pattern.test(line)
          )
      );
    });

  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
}

function findUniqueBankingRow(
  page,
  rowPattern
) {
  if (!page) {
    return null;
  }

  const matches =
    bankingPageLines(page)
      .filter(line =>
        rowPattern.test(line)
      );

  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
}

function findBankingShareCapitalEvidencePage(
  pages
) {
  const matches =
    (pages || []).filter(page => {
      const lines =
        bankingPageLines(page);

      const hasShareCapitalHeading =
        lines.some(line =>
          /^\d+\.\s+Share capital\b/i
            .test(line)
        );

      const hasIssuedHeading =
        lines.some(line =>
          /^Issued and fully paid:?$/i
            .test(line)
        );

      const hasExactOrdinaryShareDisclosure =
        lines.some(line =>
          /^At start of year [\d,]+ and at end of year ordinary shares\b/i
            .test(line)
        );

      return (
        hasShareCapitalHeading &&
        hasIssuedHeading &&
        hasExactOrdinaryShareDisclosure
      );
    });

  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
}

function discoverBankingSemanticEvidencePages(
  pages
) {
  const profitOrLoss =
    findBankingStatementPage(
      pages,
      {
        headingPattern:
          /^Consolidated statement of profit or loss$/i,
        requiredRowPatterns: [
          /^Profit attributable to:$/i,
          /^Equity holders of the company\b/i,
          /^Basic earnings per share\b/i
        ]
      }
    );

  const financialPosition =
    findBankingStatementPage(
      pages,
      {
        headingPattern:
          /^Consolidated statement of financial position$/i,
        requiredRowPatterns: [
          /^TOTAL ASSETS\b/i,
          /^Total liabilities\b/i,
          /^Total equity\b/i
        ]
      }
    );

  const cashFlows =
    findBankingStatementPage(
      pages,
      {
        headingPattern:
          /^Consolidated statement of cash ?flows$/i,
        requiredRowPatterns: [
          /^Net cash flows?.*operating activities\b/i,
          /^Cash and cash equivalents at end of year\b/i
        ]
      }
    );

  const shareCapital =
    findBankingShareCapitalEvidencePage(
      pages
    );

  return {
    profitOrLoss,
    financialPosition,
    cashFlows,
    shareCapital
  };
}


export function discoverBankingSemanticEvidencePageNumbers(
  pages
) {
  const discovered =
    discoverBankingSemanticEvidencePages(
      pages
    );

  return {
    profitOrLoss:
      discovered.profitOrLoss?.pageNumber ??
      null,
    financialPosition:
      discovered.financialPosition?.pageNumber ??
      null,
    cashFlows:
      discovered.cashFlows?.pageNumber ??
      null,
    shareCapital:
      discovered.shareCapital?.pageNumber ??
      null
  };
}


function extractSemanticBankingValuePair({
  page,
  field,
  rowPattern,
  sourceMultiplier = 1_000_000,
  statement
} = {}) {
  if (!page) {
    throw new Error(
      `Qualified banking evidence page is unavailable for ${field}.`
    );
  }

  const matches =
    bankingPageLines(page)
      .filter(line =>
        rowPattern.test(line)
      );

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one semantic banking row for ${field}; found ${matches.length}.`
    );
  }

  const parsed =
    parseTrailingComparativeValues(
      matches[0]
    );

  if (!parsed) {
    throw new Error(
      `Unable to parse current/comparative banking values for ${field}.`
    );
  }

  return {
    field,

    current:
      parsed.current *
      sourceMultiplier,

    comparative:
      parsed.comparative *
      sourceMultiplier,

    currentSourceValue:
      parsed.current,

    comparativeSourceValue:
      parsed.comparative,

    evidence:
      buildEvidenceRecord({
        field,

        value:
          parsed.current *
          sourceMultiplier,

        pageNumber:
          page.pageNumber,

        statement,

        matchedText:
          matches[0],

        extractionMethod:
          "SEMANTIC_BANKING_EXACT_ROW",

        confidence:
          "HIGH"
      })
  };
}

function extractSemanticBankingIssuedShares({
  page
} = {}) {
  if (!page) {
    throw new Error(
      "Qualified banking share-capital evidence page is unavailable."
    );
  }

  const lines =
    bankingPageLines(page);

  const issuedHeadingIndexes =
    lines
      .map(
        (line, index) => ({
          line,
          index
        })
      )
      .filter(
        candidate =>
          /^Issued and fully paid:?$/i.test(
            candidate.line
          )
      );

  if (
    issuedHeadingIndexes.length !==
    1
  ) {
    throw new Error(
      `Expected exactly one Issued and fully paid heading; found ${issuedHeadingIndexes.length}.`
    );
  }

  const headingIndex =
    issuedHeadingIndexes[0]
      .index;

  const window =
    lines.slice(
      headingIndex + 1,
      headingIndex + 5
    );

  const matches =
    window
      .map(line => ({
        line,
        match:
          line.match(
            /^At start of year\s+([\d,]+)\s+and at end of year ordinary shares\b/i
          )
      }))
      .filter(
        candidate =>
          candidate.match
      );

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one issued ordinary-share disclosure; found ${matches.length}.`
    );
  }

  const value =
    parseFinancialNumber(
      matches[0].match[1]
    );

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      "Issued ordinary-share disclosure did not contain a positive exact integer share count."
    );
  }

  return {
    field:
      "sharesOutstanding",

    value,

    evidence: {
      ...buildEvidenceRecord({
        field:
          "sharesOutstanding",

        value,

        pageNumber:
          page.pageNumber,

        statement:
          "BANKING SHARE CAPITAL",

        matchedText:
          matches[0].line,

        extractionMethod:
          "SEMANTIC_BANKING_EXACT_ISSUED_ORDINARY_SHARES",

        confidence:
          "HIGH"
      }),

      sourceUnit:
        "ORDINARY_SHARES",

      sourceMultiplier:
        1,

      exactIssuerDisclosure:
        true
    }
  };
}


function extractSemanticBankingOwnerProfit({
  page
} = {}) {
  if (!page) {
    throw new Error(
      "Qualified banking profit-or-loss evidence page is unavailable."
    );
  }

  const lines =
    bankingPageLines(page);

  const sectionIndexes =
    lines
      .map(
        (line, index) => ({
          line,
          index
        })
      )
      .filter(
        candidate =>
          /^Profit attributable to:$/i.test(
            candidate.line
          )
      );

  if (sectionIndexes.length !== 1) {
    throw new Error(
      `Expected exactly one Profit attributable to section; found ${sectionIndexes.length}.`
    );
  }

  const sectionIndex =
    sectionIndexes[0].index;

  /*
   * Bound the owner-profit lookup to the attribution
   * section immediately following "Profit attributable to:".
   *
   * This prevents a later comprehensive-income
   * "Equity holders of the company" row from being
   * mistaken for net income.
   */
  const window =
    lines.slice(
      sectionIndex + 1,
      sectionIndex + 5
    );

  const matches =
    window.filter(
      line =>
        /^Equity holders of the company\s/i.test(
          line
        )
    );

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one owner-profit row in Profit attributable to section; found ${matches.length}.`
    );
  }

  const parsed =
    parseTrailingComparativeValues(
      matches[0]
    );

  if (!parsed) {
    throw new Error(
      "Unable to parse current/comparative owner-attributable profit."
    );
  }

  return {
    field:
      "netIncome",

    current:
      parsed.current *
      1_000_000,

    comparative:
      parsed.comparative *
      1_000_000,

    evidence:
      buildEvidenceRecord({
        field:
          "netIncome",

        value:
          parsed.current *
          1_000_000,

        pageNumber:
          page.pageNumber,

        statement:
          "CONSOLIDATED STATEMENT OF PROFIT OR LOSS",

        matchedText:
          matches[0],

        extractionMethod:
          "SEMANTIC_BANKING_PROFIT_ATTRIBUTION_SECTION",

        confidence:
          "HIGH"
      })
  };
}


function extractSemanticBankingEarningsPerShare({
  page
} = {}) {
  if (!page) {
    throw new Error(
      "Qualified banking profit-or-loss evidence page is unavailable for earningsPerShare."
    );
  }

  const lines =
    bankingPageLines(page);

  /*
   * Canonical banking EPS must represent total profit
   * attributable to ordinary equity holders.
   *
   * Do not select the continuing-operations EPS section
   * when the statement separately discloses total
   * attributable-profit EPS.
   *
   * Some PDFs wrap the heading across two lines, so use
   * a bounded normalized heading window.
   */
  const headingCandidates = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const oneLine =
      normalizeBankingSemanticText(
        lines[index]
      );

    const twoLines =
      normalizeBankingSemanticText(
        [
          lines[index],
          lines[index + 1]
        ]
          .filter(Boolean)
          .join(" ")
      );

    const headingPattern =
      /^Earnings per share for profit attributable to the ordinary equity holders of the company:/i;

    if (
      headingPattern.test(oneLine) ||
      headingPattern.test(twoLines)
    ) {
      headingCandidates.push({
        index,
        consumedLines:
          headingPattern.test(oneLine)
            ? 1
            : 2
      });
    }
  }

  if (headingCandidates.length !== 1) {
    throw new Error(
      `Expected exactly one total attributable-profit EPS section; found ${headingCandidates.length}.`
    );
  }

  const heading =
    headingCandidates[0];

  const startIndex =
    heading.index +
    heading.consumedLines;

  const window =
    lines.slice(
      startIndex,
      startIndex + 5
    );

  const matches =
    window.filter(
      line =>
        /^Basic earnings per share\s+(?:\(?-?[\d,.])/i.test(
          line
        )
    );

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one Basic earnings per share row in total attributable-profit EPS section; found ${matches.length}.`
    );
  }

  const parsed =
    parseTrailingComparativeValues(
      matches[0]
    );

  if (!parsed) {
    throw new Error(
      "Unable to parse current/comparative total attributable-profit EPS."
    );
  }

  return {
    field:
      "earningsPerShare",

    current:
      parsed.current,

    comparative:
      parsed.comparative,

    evidence: {
      ...buildEvidenceRecord({
        field:
          "earningsPerShare",

        value:
          parsed.current,

        pageNumber:
          page.pageNumber,

        statement:
          "CONSOLIDATED STATEMENT OF PROFIT OR LOSS",

        matchedText:
          matches[0],

        extractionMethod:
          "SEMANTIC_BANKING_TOTAL_ATTRIBUTABLE_PROFIT_EPS_SECTION",

        confidence:
          "HIGH"
      }),

      sourceUnit:
        "KES_PER_SHARE",

      sourceMultiplier:
        1
    }
  };
}

function extractSemanticBankingEvidence({
  pages
} = {}) {
  const discovered =
    discoverBankingSemanticEvidencePages(
      pages
    );

  if (
    !discovered.profitOrLoss ||
    !discovered.financialPosition ||
    !discovered.cashFlows ||
    !discovered.shareCapital
  ) {
    throw new Error(
      "Required semantic banking statement evidence could not be uniquely discovered."
    );
  }

  const netIncome =
    extractSemanticBankingOwnerProfit({
      page:
        discovered.profitOrLoss
    });

  const totalAssets =
    extractSemanticBankingValuePair({
      page:
        discovered.financialPosition,

      field:
        "totalAssets",

      rowPattern:
        /^TOTAL ASSETS\s+(?:\(?-?[\d,])/i,

      statement:
        "CONSOLIDATED STATEMENT OF FINANCIAL POSITION"
    });

  const totalLiabilities =
    extractSemanticBankingValuePair({
      page:
        discovered.financialPosition,

      field:
        "totalLiabilities",

      rowPattern:
        /^Total liabilities\s+(?:\(?-?[\d,])/i,

      statement:
        "CONSOLIDATED STATEMENT OF FINANCIAL POSITION"
    });

  const totalEquity =
    extractSemanticBankingValuePair({
      page:
        discovered.financialPosition,

      field:
        "totalEquity",

      rowPattern:
        /^Total equity\s+(?:\(?-?[\d,])/i,

      statement:
        "CONSOLIDATED STATEMENT OF FINANCIAL POSITION"
    });

  const ownerEquity =
    extractSemanticBankingValuePair({
      page:
        discovered.financialPosition,

      field:
        "equityAttributableToOwners",

      rowPattern:
        /^Attributable to equity holders of the company\s+(?:\(?-?[\d,])/i,

      statement:
        "CONSOLIDATED STATEMENT OF FINANCIAL POSITION"
    });

  const operatingCashFlow =
    extractSemanticBankingValuePair({
      page:
        discovered.cashFlows,

      field:
        "operatingCashFlow",

      rowPattern:
        /^Net cash flows? from\/ \(used in\) operating activities\s+(?:(?:\d+\s+)?\(?-?[\d,])/i,

      statement:
        "CONSOLIDATED STATEMENT OF CASH FLOWS"
    });

  const cashAndEquivalents =
    extractSemanticBankingValuePair({
      page:
        discovered.cashFlows,

      field:
        "cashAndEquivalents",

      rowPattern:
        /^Cash and cash equivalents at end of year\s+(?:(?:\d+\s+)?\(?-?[\d,])/i,

      statement:
        "CONSOLIDATED STATEMENT OF CASH FLOWS"
    });

  const shares =
    extractSemanticBankingIssuedShares({
      page:
        discovered.shareCapital
    });

  const earningsPerShare =
    extractSemanticBankingEarningsPerShare({
      page:
        discovered.profitOrLoss
    });

  /*
   * BANKING DERIVED METRICS:
   *
   * BVPS uses equity attributable to ordinary owners,
   * not consolidated total equity including NCI.
   *
   * ROE uses owner-attributable profit divided by
   * average owner-attributable equity.
   */
  const bookValuePerShare =
    ownerEquity.current /
    shares.value;

  const averageOwnerEquity =
    (
      ownerEquity.current +
      ownerEquity.comparative
    ) /
    2;

  if (
    !Number.isFinite(bookValuePerShare) ||
    bookValuePerShare <= 0
  ) {
    throw new Error(
      "Unable to derive positive banking bookValuePerShare from qualified owner equity and issued shares."
    );
  }

  if (
    !Number.isFinite(averageOwnerEquity) ||
    averageOwnerEquity <= 0
  ) {
    throw new Error(
      "Unable to derive positive average owner equity for banking returnOnEquity."
    );
  }

  const returnOnEquity =
    (
      netIncome.current /
      averageOwnerEquity
    ) *
    100;

  if (
    !Number.isFinite(returnOnEquity)
  ) {
    throw new Error(
      "Unable to derive banking returnOnEquity from qualified owner profit and average owner equity."
    );
  }

  return {
    periodValues: {
      netIncome:
        netIncome.current,

      totalAssets:
        totalAssets.current,

      totalLiabilities:
        totalLiabilities.current,

      totalEquity:
        totalEquity.current,

      operatingCashFlow:
        operatingCashFlow.current,

      cashAndEquivalents:
        cashAndEquivalents.current,

      sharesOutstanding:
        shares.value,

      earningsPerShare:
        earningsPerShare.current,

      bookValuePerShare,

      returnOnEquity
    },

    ownerProfit: {
      current:
        netIncome.current,
      comparative:
        netIncome.comparative,
      evidence:
        netIncome.evidence
    },

    ownerEquity: {
      current:
        ownerEquity.current,
      comparative:
        ownerEquity.comparative,
      evidence:
        ownerEquity.evidence
    },

    shareEvidence:
      shares,

    earningsPerShare: {
      current:
        earningsPerShare.current,
      comparative:
        earningsPerShare.comparative,
      evidence:
        earningsPerShare.evidence
    },

    evidence: [
      netIncome.evidence,
      totalAssets.evidence,
      totalLiabilities.evidence,
      totalEquity.evidence,
      operatingCashFlow.evidence,
      cashAndEquivalents.evidence,
      shares.evidence,
      ownerEquity.evidence,
      earningsPerShare.evidence
    ]
  };
}


export function extractSemanticBankingEvidenceForTest(
  pages
) {
  const result =
    extractSemanticBankingEvidence({
      pages
    });

  return {
    periodValues:
      result.periodValues,

    ownerProfit: {
      current:
        result.ownerProfit.current,
      comparative:
        result.ownerProfit.comparative,
      pageNumber:
        result.ownerProfit.evidence?.pageNumber ??
        null
    },

    ownerEquity: {
      current:
        result.ownerEquity.current,
      comparative:
        result.ownerEquity.comparative,
      pageNumber:
        result.ownerEquity.evidence?.pageNumber ??
        null
    },

    earningsPerShare: {
      current:
        result.earningsPerShare.current,
      comparative:
        result.earningsPerShare.comparative,
      pageNumber:
        result.earningsPerShare.evidence?.pageNumber ??
        null,
      sourceUnit:
        result.earningsPerShare.evidence?.sourceUnit ??
        null,
      sourceMultiplier:
        result.earningsPerShare.evidence?.sourceMultiplier ??
        null
    },

    shareEvidence: {
      value:
        result.shareEvidence.value,
      pageNumber:
        result.shareEvidence.evidence?.pageNumber ??
        null,
      sourceUnit:
        result.shareEvidence.evidence?.sourceUnit ??
        null,
      sourceMultiplier:
        result.shareEvidence.evidence?.sourceMultiplier ??
        null,
      exactIssuerDisclosure:
        result.shareEvidence.evidence?.exactIssuerDisclosure ??
        false
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

const GENERIC_FINANCIAL_HIGHLIGHT_FIELDS =
  Object.freeze([
    Object.freeze({
      field: "revenue",
      labels: Object.freeze([
        /^Total revenue\b/i,
        /^Revenue\b/i
      ]),
      scale: 1_000_000
    }),
    Object.freeze({
      field: "ebitda",
      labels: Object.freeze([
        /^EBITDA\b/i,
        /\(EBITDA\)/i
      ]),
      scale: 1_000_000
    }),
    Object.freeze({
      field: "operatingIncome",
      labels: Object.freeze([
        /^Operating profit\b/i,
        /^EBIT\b/i
      ]),
      scale: 1_000_000
    }),
    Object.freeze({
      field: "netIncome",
      labels: Object.freeze([
        /^Equity holders of (?:the )?parent\b/i,
        /^Owners of (?:the )?parent\b/i,
        /^Profit attributable to (?:equity holders|owners) of (?:the )?parent\b/i
      ]),
      scale: 1_000_000,
      accountingScope: "ATTRIBUTABLE_TO_OWNERS"
    }),
    Object.freeze({
      field: "earningsPerShare",
      labels: Object.freeze([
        /^Basic(?: and diluted)? earnings per share\b/i,
        /^Basic EPS\b/i
      ]),
      scale: 1
    }),
    Object.freeze({
      field: "freeCashFlow",
      labels: Object.freeze([
        /^Free cash flow\b/i
      ]),
      scale: 1_000_000
    }),
    Object.freeze({
      field: "dividendPerShare",
      labels: Object.freeze([
        /^Ordinary dividend per share\b/i,
        /^Dividend(?:s)? per share\b/i
      ]),
      scale: 1
    })
  ]);


function parseGenericGroupCompanyComparativeValues(
  line
) {
  const text =
    normalizeText(line);

  const matches = [
    ...text.matchAll(
      /(?:^|\s)(\(?-?[\d,]+(?:\.\d+)?\)?)(?=\s|$)/g
    )
  ];

  if (matches.length !== 4) {
    return null;
  }

  const tokens =
    matches.map(
      match => match[1]
    );

  const values =
    tokens.map(
      parseFinancialNumber
    );

  if (
    values.some(
      value => value === null
    )
  ) {
    return null;
  }

  return {
    current:
      values[0],

    comparative:
      values[1],

    currentToken:
      tokens[0],

    comparativeToken:
      tokens[1],

    companyCurrent:
      values[2],

    companyComparative:
      values[3],

    companyCurrentToken:
      tokens[2],

    companyComparativeToken:
      tokens[3]
  };
}

const GENERIC_PRIMARY_STATEMENT_FIELDS =
  Object.freeze([
    Object.freeze({
      field:
        "totalAssets",

      statementPattern:
        /statement of financial position/i,

      labels:
        Object.freeze([
          /^Total assets\b/i
        ])
    }),

    Object.freeze({
      field:
        "totalLiabilities",

      statementPattern:
        /statement of financial position/i,

      labels:
        Object.freeze([
          /^Total liabilities\b/i
        ])
    }),

    Object.freeze({
      field:
        "totalEquity",

      statementPattern:
        /statement of financial position/i,

      labels:
        Object.freeze([
          /^Total equity(?=\s+(?:\(?[\d,])|$)/i
        ])
    }),

    Object.freeze({
      field:
        "operatingCashFlow",

      statementPattern:
        /statement of cash flows?/i,

      labels:
        Object.freeze([
          /^Net cash (?:generated from|flows? from) operating activities\b/i
        ])
    })
  ]);

function findGenericPrimaryStatementField({
  pages,
  mapping,
  currentFiscalYear
} = {}) {
  const candidates = [];

  for (
    const page of pages || []
  ) {
    const pageLines =
      String(page?.text || "")
        .split("\n")
        .map(normalizeText)
        .filter(Boolean);

    if (!pageLines.length) {
      continue;
    }

    const pageText =
      pageLines.join(" ");

    if (
      !mapping.statementPattern.test(
        pageText
      )
    ) {
      continue;
    }

    if (
      !/\bGROUP\b/i.test(pageText) ||
      !/\bCOMPANY\b/i.test(pageText)
    ) {
      continue;
    }

    const comparativeFiscalYear =
      Number(currentFiscalYear) - 1;

    if (
      !Number.isInteger(
        Number(currentFiscalYear)
      ) ||
      !Number.isInteger(
        comparativeFiscalYear
      )
    ) {
      continue;
    }

    const yearTokens =
      pageLines.flatMap(
        line =>
          line.match(
            /\b20\d{2}\b/g
          ) || []
      );

    const currentYearCount =
      yearTokens.filter(
        token =>
          Number(token) ===
          Number(currentFiscalYear)
      ).length;

    const comparativeYearCount =
      yearTokens.filter(
        token =>
          Number(token) ===
          comparativeFiscalYear
      ).length;

    if (
      currentYearCount < 2 ||
      comparativeYearCount < 2
    ) {
      continue;
    }

    const matchingLines =
      pageLines.filter(
        line =>
          mapping.labels.some(
            regex =>
              regex.test(line)
          )
      );

    if (
      matchingLines.length !== 1
    ) {
      continue;
    }

    const parsed =
      parseGenericGroupCompanyComparativeValues(
        matchingLines[0]
      );

    if (!parsed) {
      continue;
    }

    candidates.push({
      pageNumber:
        page.pageNumber,

      line:
        matchingLines[0],

      parsed
    });
  }

  return candidates.length === 1
    ? candidates[0]
    : null;
}

function buildGenericPrimaryStatementEvidence({
  pages,
  identity,
  periods
} = {}) {
  const currentFiscalYear =
    Number(
      identity?.fiscalYear
    );

  if (
    !Number.isInteger(
      currentFiscalYear
    )
  ) {
    return null;
  }

  const comparativeFiscalYear =
    currentFiscalYear - 1;

  const nextPeriods =
    Array.isArray(periods)
      ? periods.map(
          period => ({
            ...period
          })
        )
      : [];

  function ensurePeriod(
    fiscalYear
  ) {
    let period =
      nextPeriods.find(
        candidate =>
          Number(
            candidate?.fiscalYear
          ) === fiscalYear
      );

    if (!period) {
      period =
        buildInitialExtractionResult({
          fiscalYear,

          periodEnd:
            fiscalYear ===
              currentFiscalYear
              ? (
                  identity?.periodEnd ||
                  null
                )
              : null,

          currency:
            "KES"
        });

      nextPeriods.push(
        period
      );
    }

    return period;
  }

  const currentPeriod =
    ensurePeriod(
      currentFiscalYear
    );

  const comparativePeriod =
    ensurePeriod(
      comparativeFiscalYear
    );

  const evidence = [];

  for (
    const mapping of
    GENERIC_PRIMARY_STATEMENT_FIELDS
  ) {
    const candidate =
      findGenericPrimaryStatementField({
        pages,
        mapping,
        currentFiscalYear
      });

    if (!candidate) {
      continue;
    }

    const values = [
      {
        fiscalYear:
          currentFiscalYear,

        period:
          currentPeriod,

        value:
          candidate.parsed.current,

        token:
          candidate.parsed.currentToken
      },

      {
        fiscalYear:
          comparativeFiscalYear,

        period:
          comparativePeriod,

        value:
          candidate.parsed.comparative,

        token:
          candidate.parsed.comparativeToken
      }
    ];

    for (
      const item of values
    ) {
      if (
        item.period[
          mapping.field
        ] !== null &&
        item.period[
          mapping.field
        ] !== undefined
      ) {
        continue;
      }

      const canonicalValue =
        Math.round(
          item.value *
          1_000_000
        );

      item.period[
        mapping.field
      ] =
        canonicalValue;

      evidence.push({
        ...buildEvidenceRecord({
          field:
            mapping.field,

          value:
            canonicalValue,

          pageNumber:
            candidate.pageNumber,

          statement:
            mapping.statementPattern
              .source
              .toLowerCase()
              .includes(
                "cash flow"
              )
              ? "STATEMENT OF CASH FLOWS"
              : "STATEMENT OF FINANCIAL POSITION",

          matchedText:
            candidate.line,

          extractionMethod:
            "DETERMINISTIC_GROUP_COMPANY_PRIMARY_STATEMENT",

          confidence:
            "HIGH"
        }),

        fiscalYear:
          item.fiscalYear,

        periodType:
          "ANNUAL",

        sourceUnit:
          "KES_MILLIONS",

        sourceMultiplier:
          1_000_000,

        sourceValue:
          item.value,

        sourceToken:
          item.token,

        accountingScope:
          "GROUP"
      });
    }
  }

  if (!evidence.length) {
    return null;
  }

  nextPeriods.sort(
    (left, right) =>
      Number(
        right?.fiscalYear || 0
      ) -
      Number(
        left?.fiscalYear || 0
      )
  );

  return {
    periods:
      nextPeriods,

    evidence
  };
}

function parseGenericFiscalYearHeader(line) {
  const text = normalizeText(line);
  const matches = [
    ...text.matchAll(/\bFY(\d{2}|\d{4})\b/gi)
  ];

  if (matches.length < 3) {
    return null;
  }

  const years = matches.map(match => {
    const token = match[1];
    const value = Number(token);
    return token.length === 2
      ? 2000 + value
      : value;
  });

  if (new Set(years).size !== years.length) {
    return null;
  }

  return years;
}

function parseGenericFinancialHighlightValues(
  line,
  expectedCount
) {
  const text = normalizeText(line);
  const matches = [
    ...text.matchAll(
      /(?:^|\s)(\(?-?[\d,]+(?:\.\d+)?\)?)(?=\s|$)/g
    )
  ];

  if (matches.length < expectedCount) {
    return null;
  }

  const selected =
    matches.slice(-expectedCount);

  const values = selected.map(match =>
    parseFinancialNumber(match[1])
  );

  if (values.some(value => value === null)) {
    return null;
  }

  return {
    values,
    tokens: selected.map(match => match[1])
  };
}

function findGenericFinancialHighlightTable({
  pages,
  identity
} = {}) {
  const candidates = [];

  for (const page of pages || []) {
    const pageLines = String(page?.text || "")
      .split("\n")
      .map(normalizeText)
      .filter(Boolean);

    if (pageLines.length === 0) {
      continue;
    }

    const pageText = pageLines.join(" ");

    if (!/\bfinancial highlights\b/i.test(pageText)) {
      continue;
    }

    if (!/\bKShs[’\x27]?\s*Mn\b/i.test(pageText)) {
      continue;
    }

    const headers = pageLines
      .map(parseGenericFiscalYearHeader)
      .filter(Array.isArray);

    if (headers.length !== 1) {
      continue;
    }

    const years = headers[0];

    if (
      identity?.fiscalYear &&
      !years.includes(Number(identity.fiscalYear))
    ) {
      continue;
    }

    const fieldRows = {};

    for (const mapping of
      GENERIC_FINANCIAL_HIGHLIGHT_FIELDS
    ) {
      const matchingLines = pageLines.filter(line =>
        mapping.labels.some(regex => regex.test(line))
      );

      let selectedLine =
        matchingLines.length === 1
          ? matchingLines[0]
          : null;

      if (
        matchingLines.length > 1 &&
        mapping.accountingScope ===
          "ATTRIBUTABLE_TO_OWNERS"
      ) {
        selectedLine =
          resolveContextualAttributableProfitLine({
            pageLines,
            matchingLines
          });
      }

      if (!selectedLine) {
        continue;
      }

      const parsed =
        parseGenericFinancialHighlightValues(
          selectedLine,
          years.length
        );

      if (!parsed) {
        continue;
      }

      fieldRows[mapping.field] = {
        mapping,
        line: selectedLine,
        values: parsed.values,
        tokens: parsed.tokens
      };
    }

    if (Object.keys(fieldRows).length < 4) {
      continue;
    }

    candidates.push({
      pageNumber: page.pageNumber,
      years,
      fieldRows
    });
  }

  if (candidates.length !== 1) {
    return null;
  }

  return candidates[0];
}

function resolveContextualAttributableProfitLine({
  pageLines,
  matchingLines
}) {
  if (
    !Array.isArray(pageLines) ||
    !Array.isArray(matchingLines) ||
    matchingLines.length < 2
  ) {
    return null;
  }

  const candidates =
    matchingLines.filter(line => {
      const lineIndex =
        pageLines.indexOf(line);

      if (lineIndex < 1) {
        return false;
      }

      const previousLine =
        pageLines[lineIndex - 1];

      if (
        !/^Attributable to:\s*$/i.test(
          previousLine
        )
      ) {
        return false;
      }

      const contextStart =
        Math.max(
          0,
          lineIndex - 4
        );

      const precedingContext =
        pageLines
          .slice(
            contextStart,
            lineIndex
          )
          .join(" ");

      if (
        /comprehensive income/i.test(
          precedingContext
        )
      ) {
        return false;
      }

      return /\bprofit\b/i.test(
        precedingContext
      );
    });

  return candidates.length === 1
    ? candidates[0]
    : null;
}

function buildGenericMultiPeriodFinancialHighlights({
  pages,
  identity
} = {}) {
  const table =
    findGenericFinancialHighlightTable({
      pages,
      identity
    });

  if (!table) {
    return null;
  }

  const periods = table.years.map(fiscalYear =>
    buildInitialExtractionResult({
      fiscalYear,
      periodEnd:
        Number(identity?.fiscalYear) === fiscalYear
          ? (identity?.periodEnd || null)
          : null,
      currency: "KES"
    })
  );

  const evidence = [];

  for (const [field, row] of
    Object.entries(table.fieldRows)
  ) {
    row.values.forEach((sourceValue, index) => {
      const fiscalYear = table.years[index];
      const value =
        sourceValue * row.mapping.scale;

      periods[index][field] = value;

      evidence.push({
        ...buildEvidenceRecord({
          field,
          value,
          pageNumber: table.pageNumber,
          statement:
            "MULTI-YEAR FINANCIAL HIGHLIGHTS",
          matchedText: row.line,
          extractionMethod:
            "DETERMINISTIC_MULTI_PERIOD_FINANCIAL_HIGHLIGHTS",
          confidence: "HIGH"
        }),
        fiscalYear,
        periodType: "ANNUAL",
        sourceUnit:
          row.mapping.scale === 1_000_000
            ? "KES_MILLIONS"
            : "KES_PER_SHARE",
        sourceMultiplier: row.mapping.scale,
        sourceValue,
        sourceToken: row.tokens[index],
        accountingScope:
          row.mapping.accountingScope || null
      });
    });
  }

  return { periods, evidence };
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

  let periods = [
    period
  ];

  let extractedEvidence = [];

  if (
    policy ===
      FINANCIAL_EXTRACTION_POLICIES
        .GENERIC
  ) {
    const genericHighlights =
      buildGenericMultiPeriodFinancialHighlights({
        pages:
          pdf.pages,
        identity
      });

    if (genericHighlights) {
      periods =
        genericHighlights.periods;

      extractedEvidence =
        genericHighlights.evidence;
    }

    const primaryStatementEvidence =
      buildGenericPrimaryStatementEvidence({
        pages:
          pdf.pages,
        identity,
        periods
      });

    if (primaryStatementEvidence) {
      periods =
        primaryStatementEvidence.periods;

      extractedEvidence = [
        ...extractedEvidence,
        ...primaryStatementEvidence.evidence
      ];
    }

    const genericShareEvidence =
      extractGenericExactIssuedOrdinaryShares({
        pages:
          pdf.pages
      });

    if (genericShareEvidence) {
      const targetFiscalYear =
        Number(
          identity?.fiscalYear
        );

      const targetPeriod =
        periods.find(candidate =>
          Number(
            candidate?.fiscalYear
          ) ===
          targetFiscalYear
        );

      if (!targetPeriod) {
        throw new Error(
          "Exact issued-share evidence could not be mapped to the filing fiscal year."
        );
      }

      targetPeriod[
        genericShareEvidence.field
      ] =
        genericShareEvidence.value;

      extractedEvidence = [
        ...extractedEvidence,
        genericShareEvidence.evidence
      ];
    }
  }

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

    periods,

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
