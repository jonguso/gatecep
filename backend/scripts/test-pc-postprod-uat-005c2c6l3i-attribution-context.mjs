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
    "L3I ABORTED: unexpected PDF hash."
  );
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

const loadingTask =
  pdfjsLib.getDocument({
    data: new Uint8Array(buffer)
  });

const pdf =
  await loadingTask.promise;

console.log(`PAGE_COUNT=${pdf.numPages}`);

const page =
  await pdf.getPage(110);

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

console.log("");
console.log("===== PAGE 110 LINES 28-52 =====");

for (
  let index = 28;
  index <= 52 &&
  index < lines.length;
  index += 1
) {
  console.log(
    `${index}: ${JSON.stringify(lines[index])}`
  );
}

console.log("");
console.log("===== ATTRIBUTABLE ROWS WITH CONTEXT =====");

const attributionIndexes =
  lines
    .map((line, index) => ({
      line,
      index
    }))
    .filter(row =>
      /equity holders? of (?:the )?parent/i.test(
        row.line
      )
    );

console.log(
  `ATTRIBUTION_ROW_COUNT=${attributionIndexes.length}`
);

for (const row of attributionIndexes) {
  console.log("");
  console.log(
    `ATTRIBUTION_INDEX=${row.index}`
  );

  const start =
    Math.max(
      0,
      row.index - 5
    );

  const end =
    Math.min(
      lines.length - 1,
      row.index + 5
    );

  for (
    let index = start;
    index <= end;
    index += 1
  ) {
    console.log(
      `${index}: ${JSON.stringify(lines[index])}`
    );
  }
}

console.log("");
console.log("===== SECTION SIGNALS =====");

const sectionPatterns = [
  /profit after tax/i,
  /profit for the year/i,
  /attributable to/i,
  /other comprehensive/i,
  /comprehensive income/i,
  /hyperinflation/i,
  /earnings per share/i,
  /non-controlling/i,
  /equity holders?/i
];

for (
  let index = 28;
  index <= 55 &&
  index < lines.length;
  index += 1
) {
  if (
    sectionPatterns.some(regex =>
      regex.test(lines[index])
    )
  ) {
    console.log(
      `${index}: ${JSON.stringify(lines[index])}`
    );
  }
}

console.log("");
console.log("===== GENERIC NET-INCOME DEFINITION =====");

const source =
  fs.readFileSync(
    "backend/src/modules/fundamental-evidence/issuerFinancialStatementEvidenceExtractor.js",
    "utf8"
  );

const genericStart =
  source.indexOf(
    "const GENERIC_FINANCIAL_HIGHLIGHT_FIELDS"
  );

const genericEnd =
  source.indexOf(
    "function",
    genericStart
  );

if (
  genericStart >= 0 &&
  genericEnd > genericStart
) {
  const genericBlock =
    source.slice(
      genericStart,
      genericEnd
    );

  const netIndex =
    genericBlock.indexOf(
      'field: "netIncome"'
    );

  console.log(
    `GENERIC_NET_INCOME_FOUND=${netIndex >= 0 ? 1 : 0}`
  );

  if (netIndex >= 0) {
    console.log(
      genericBlock.slice(
        Math.max(
          0,
          netIndex - 100
        ),
        netIndex + 650
      )
    );
  }
} else {
  console.log(
    "GENERIC_BLOCK_FOUND=0"
  );
}

await pdf.destroy();

console.log("");
console.log(
  "PC-POSTPROD-UAT-005C2C6L3I RESULT: DISCOVERY PASS"
);
