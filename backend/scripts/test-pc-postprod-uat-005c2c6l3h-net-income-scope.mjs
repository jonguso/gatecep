import fs from "node:fs";
import crypto from "node:crypto";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath =
  "C:/Users/Jared.Onguso/Downloads/safaricom-annual-report.pdf";

const expectedSha256 =
  "c84143a6d5e03aac5c170d27ae9685e9f2e77f92b2a40c3f073ee29030174ed0";

const buffer =
  fs.readFileSync(pdfPath);

const sha256 =
  crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

console.log(`PDF_BYTES=${buffer.length}`);
console.log(`PDF_SHA256=${sha256}`);

if (sha256 !== expectedSha256) {
  throw new Error(
    "L3H ABORTED: unexpected PDF hash."
  );
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function numericTokens(line) {
  return [
    ...normalizeText(line).matchAll(
      /(?:^|\s)(\(?-?[\d,]+(?:\.\d+)?\)?)(?=\s|$)/g
    )
  ].map(match => match[1]);
}

async function readPageLines(pdf, pageNumber) {
  const page =
    await pdf.getPage(pageNumber);

  const content =
    await page.getTextContent();

  const lines = [];
  let currentLine = "";

  for (const item of content.items) {
    if (
      !item ||
      typeof item.str !== "string"
    ) {
      continue;
    }

    const token =
      normalizeText(item.str);

    if (token) {
      currentLine +=
        `${currentLine ? " " : ""}${token}`;
    }

    if (item.hasEOL) {
      const normalized =
        normalizeText(currentLine);

      if (normalized) {
        lines.push(normalized);
      }

      currentLine = "";
    }
  }

  const trailing =
    normalizeText(currentLine);

  if (trailing) {
    lines.push(trailing);
  }

  return lines;
}

const loadingTask =
  pdfjsLib.getDocument({
    data: new Uint8Array(buffer)
  });

const pdf =
  await loadingTask.promise;

console.log(`PAGE_COUNT=${pdf.numPages}`);

const pageNumber = 110;
const lines =
  await readPageLines(
    pdf,
    pageNumber
  );

console.log("");
console.log("===== PAGE 110 PROFIT / ATTRIBUTION ROWS =====");

const relevantPatterns = [
  /\bprofit\b/i,
  /\bearnings\b/i,
  /\bequity holders?\b/i,
  /\bowners?\b/i,
  /\battribut/i,
  /\bEPS\b/i
];

const relevant =
  lines
    .map((line, index) => ({
      index,
      line,
      numericTokens:
        numericTokens(line)
    }))
    .filter(row =>
      relevantPatterns.some(regex =>
        regex.test(row.line)
      )
    );

console.log(
  `RELEVANT_LINE_COUNT=${relevant.length}`
);

for (const row of relevant) {
  console.log(
    JSON.stringify(
      row,
      null,
      2
    )
  );
}

console.log("");
console.log("===== EXPECTED PROFIT VALUE LOCATIONS =====");

const expectedValues = [
  "42,658.4",
  "52,482.8",
  "67,496.1",
  "68,676.2",
  "73,657.9",
  "62,991.7",
  "62,268.9",
  "69,648.1"
];

for (const token of expectedValues) {
  const occurrences =
    lines
      .map((line, index) => ({
        index,
        line
      }))
      .filter(row =>
        row.line.includes(token)
      );

  console.log(
    `${token}=${JSON.stringify(occurrences)}`
  );
}

console.log("");
console.log("===== NET-INCOME MAPPING IN PRODUCTION =====");

const source =
  fs.readFileSync(
    "backend/src/modules/fundamental-evidence/issuerFinancialStatementEvidenceExtractor.js",
    "utf8"
  );

const fieldIndex =
  source.indexOf(
    'field: "netIncome"'
  );

console.log(
  `NET_INCOME_MAPPING_FOUND=${fieldIndex >= 0 ? 1 : 0}`
);

if (fieldIndex >= 0) {
  console.log(
    source.slice(
      Math.max(0, fieldIndex - 180),
      fieldIndex + 700
    )
  );
}

console.log("");
console.log("===== ACCOUNTING-SCOPE OBSERVATION =====");

console.log(
  "No accounting choice is made by this diagnostic."
);

console.log(
  "Compare group profit-after-tax rows with parent-attributable rows and EPS context before changing production."
);

await pdf.destroy();

console.log("");
console.log(
  "PC-POSTPROD-UAT-005C2C6L3H RESULT: DISCOVERY PASS"
);
