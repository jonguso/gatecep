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
    "L3E ABORTED: unexpected PDF hash."
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

const pageNumber = 110;

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

console.log("");
console.log("===== PAGE 110 EBITDA CONTEXT =====");

const ebitdaIndexes =
  lines
    .map((line, index) => ({
      line,
      index
    }))
    .filter(row =>
      /\bEBITDA\b/i.test(row.line)
    );

console.log(
  `EBITDA_LINE_COUNT=${ebitdaIndexes.length}`
);

for (const match of ebitdaIndexes) {
  console.log("");
  console.log(
    `EBITDA_INDEX=${match.index}`
  );

  const start =
    Math.max(
      0,
      match.index - 3
    );

  const end =
    Math.min(
      lines.length - 1,
      match.index + 4
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
console.log("===== NUMERIC TOKEN COUNTS =====");

function numericTokens(line) {
  return [
    ...normalizeText(line).matchAll(
      /(?:^|\s)(\(?-?[\d,]+(?:\.\d+)?\)?)(?=\s|$)/g
    )
  ].map(match => match[1]);
}

for (const match of ebitdaIndexes) {
  const same =
    numericTokens(match.line);

  const next =
    lines[match.index + 1]
      ? numericTokens(
          lines[match.index + 1]
        )
      : [];

  const previous =
    lines[match.index - 1]
      ? numericTokens(
          lines[match.index - 1]
        )
      : [];

  console.log(
    JSON.stringify(
      {
        index: match.index,
        line: match.line,
        sameLineTokens: same,
        previousLine:
          lines[match.index - 1] || null,
        previousLineTokens: previous,
        nextLine:
          lines[match.index + 1] || null,
        nextLineTokens: next,
        combinedSameNext:
          [...same, ...next]
      },
      null,
      2
    )
  );
}

console.log("");
console.log("===== EXPECTED EBITDA TOKENS =====");

const expected = [
  "163,292.6",
  "139,862.4",
  "149,061.9",
  "134,129.2",
  "138,041.6"
];

for (const token of expected) {
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

await pdf.destroy();

console.log("");
console.log(
  "PC-POSTPROD-UAT-005C2C6L3E RESULT: DISCOVERY PASS"
);
