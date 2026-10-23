import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  discoverBankingSemanticEvidencePageNumbers
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
        (
          currentLine
            ? " "
            : ""
        ) +
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
    text: lines.join("\n")
  });
}

const result =
  discoverBankingSemanticEvidencePageNumbers(
    pages
  );

console.log(
  "KCB_SEMANTIC_PAGES=" +
  JSON.stringify(result)
);

assert.deepEqual(
  result,
  {
    profitOrLoss: 78,
    financialPosition: 79,
    cashFlows: 82,
    shareCapital: 129
  }
);

console.log(
  "PASS — KCB consolidated profit statement discovered semantically."
);

console.log(
  "PASS — KCB consolidated financial position discovered semantically."
);

console.log(
  "PASS — KCB consolidated cash-flow statement discovered semantically."
);

console.log(
  "PASS — KCB issued-share evidence discovered semantically."
);

const ambiguous =
  pages.concat([
    {
      ...pages.find(
        page =>
          page.pageNumber === 79
      ),
      pageNumber: 999
    }
  ]);

const ambiguousResult =
  discoverBankingSemanticEvidencePageNumbers(
    ambiguous
  );

assert.equal(
  ambiguousResult.financialPosition,
  null
);

console.log(
  "PASS — duplicate qualified statement evidence fails closed."
);

const unknown = [
  {
    pageNumber: 1,
    lines: [
      "Unrelated document",
      "Total assets 100 90"
    ],
    text:
      "Unrelated document\n" +
      "Total assets 100 90"
  }
];

assert.deepEqual(
  discoverBankingSemanticEvidencePageNumbers(
    unknown
  ),
  {
    profitOrLoss: null,
    financialPosition: null,
    cashFlows: null,
    shareCapital: null
  }
);

console.log(
  "PASS — unrelated document cannot fabricate banking statement pages."
);

await document.destroy();

console.log(
  "PASS — FUND-010F8 semantic banking locator contract."
);
