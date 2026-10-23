import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  extractSemanticBankingEvidenceForTest
} from "../src/modules/fundamental-evidence/issuerFinancialStatementEvidenceExtractor.js";

const pdfPath =
  process.env.KCB_PDF_PATH;

assert.ok(
  pdfPath,
  "KCB_PDF_PATH is required"
);

const buffer =
  await readFile(pdfPath);

const document =
  await getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true
  }).promise;

const normalize = value =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const pages = [];

for (
  let pageNumber = 1;
  pageNumber <= document.numPages;
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
      normalize(item?.str);

    if (value) {
      currentLine +=
        (currentLine ? " " : "") +
        value;
    }

    if (item?.hasEOL) {
      const line =
        normalize(currentLine);

      if (line) {
        lines.push(line);
      }

      currentLine = "";
    }
  }

  const tail =
    normalize(currentLine);

  if (tail) {
    lines.push(tail);
  }

  pages.push({
    pageNumber,
    lines,
    text:
      lines.join("\n")
  });
}

const result =
  extractSemanticBankingEvidenceForTest(
    pages
  );

console.log(
  "KCB_SEMANTIC_VALUES=" +
  JSON.stringify(result)
);

assert.deepEqual(
  result.periodValues,
  {
    netIncome:
      66_819_000_000,

    totalAssets:
      2_147_206_000_000,

    totalLiabilities:
      1_806_651_000_000,

    totalEquity:
      340_555_000_000,

    operatingCashFlow:
      103_951_000_000,

    cashAndEquivalents:
      404_899_000_000,

    sharesOutstanding:
      3_213_462_815,

    earningsPerShare:
      20.80,

    bookValuePerShare:
      331_466_000_000 /
      3_213_462_815,

    returnOnEquity:
      (
        66_819_000_000 /
        (
          (
            274_888_000_000 +
            331_466_000_000
          ) /
          2
        )
      ) *
      100
  }
);

assert.deepEqual(
  result.ownerProfit,
  {
    current:
      66_819_000_000,

    comparative:
      60_090_000_000,

    pageNumber:
      78
  }
);

assert.deepEqual(
  result.ownerEquity,
  {
    current:
      331_466_000_000,

    comparative:
      274_888_000_000,

    pageNumber:
      79
  }
);

assert.deepEqual(
  result.earningsPerShare,
  {
    current:
      20.80,

    comparative:
      18.70,

    pageNumber:
      78,

    sourceUnit:
      "KES_PER_SHARE",

    sourceMultiplier:
      1
  }
);

console.log(
  "PASS — KCB total attributable-profit EPS extracted as 20.80, not continuing-operations EPS 19.81."
);

assert.ok(
  Math.abs(
    result.periodValues.bookValuePerShare -
    (
      331_466_000_000 /
      3_213_462_815
    )
  ) < 1e-10
);

assert.ok(
  Math.abs(
    result.periodValues.returnOnEquity -
    (
      (
        66_819_000_000 /
        (
          (
            274_888_000_000 +
            331_466_000_000
          ) /
          2
        )
      ) *
      100
    )
  ) < 1e-10
);

console.log(
  "KCB_BVPS=" +
  result.periodValues.bookValuePerShare
);

console.log(
  "KCB_ROE=" +
  result.periodValues.returnOnEquity
);

console.log(
  "PASS — KCB BVPS uses owner-attributable equity divided by exact issued shares."
);

console.log(
  "PASS — KCB ROE uses owner-attributable profit divided by average owner-attributable equity."
);

assert.deepEqual(
  result.shareEvidence,
  {
    value:
      3_213_462_815,

    pageNumber:
      129,

    sourceUnit:
      "ORDINARY_SHARES",

    sourceMultiplier:
      1,

    exactIssuerDisclosure:
      true
  }
);

console.log(
  "PASS — KCB owner-attributable profit extracted exactly."
);

console.log(
  "PASS — KCB consolidated balance-sheet values extracted exactly."
);

console.log(
  "PASS — KCB operating and ending-cash values extracted exactly."
);

console.log(
  "PASS — KCB owner-attributable equity extracted exactly."
);

console.log(
  "PASS — KCB issued shares extracted from exact issuer disclosure."
);

/*
 * Fail-closed regression:
 * duplicate the qualified owner-profit row.
 */
const ambiguousPages =
  pages.map(page => {
    if (page.pageNumber !== 78) {
      return page;
    }

    const attributionIndex =
      page.lines.findIndex(
        line =>
          /^Profit attributable to:$/i.test(
            line
          )
      );

    assert.ok(
      attributionIndex >= 0,
      "Profit attributable to section required for ambiguity regression"
    );

    const lines = [
      ...page.lines
    ];

    /*
     * Insert a second owner-profit row inside the
     * bounded attribution section. A duplicate elsewhere
     * on the page is intentionally irrelevant.
     */
    lines.splice(
      attributionIndex + 2,
      0,
      "Equity holders of the company 1 1"
    );

    return {
      ...page,
      lines,
      text:
        lines.join("\n")
    };
  });

assert.throws(
  () =>
    extractSemanticBankingEvidenceForTest(
      ambiguousPages
    ),
  /exactly one owner-profit row in Profit attributable to section/
);

console.log(
  "PASS — duplicate owner-profit evidence fails closed."
);

/*
 * Fail-closed regression:
 * authorized shares alone must never become
 * sharesOutstanding.
 */
const noIssuedDisclosurePages =
  pages.map(page => {
    if (page.pageNumber !== 129) {
      return page;
    }

    const lines =
      page.lines.filter(
        line =>
          !/^At start of year\s+3,213,462,815\s+and at end of year ordinary shares\b/i
            .test(line)
      );

    return {
      ...page,
      lines,
      text:
        lines.join("\n")
    };
  });

assert.throws(
  () =>
    extractSemanticBankingEvidenceForTest(
      noIssuedDisclosurePages
    ),
  /semantic banking statement evidence could not be uniquely discovered|issued ordinary-share disclosure/i
);

console.log(
  "PASS — authorized share count cannot substitute for issued shares."
);

await document.destroy();

console.log(
  "PASS — FUND-010F10-R3 real KCB semantic value contract."
);
