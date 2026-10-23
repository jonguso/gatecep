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
    "L3B ABORTED: unexpected PDF hash."
  );
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function parseFiscalYearHeader(line) {
  const text =
    normalizeText(line);

  const matches = [
    ...text.matchAll(
      /\bFY(\d{2}|\d{4})\b/gi
    )
  ];

  if (matches.length < 3) {
    return null;
  }

  const years =
    matches.map(match => {
      const token =
        match[1];

      const value =
        Number(token);

      return token.length === 2
        ? 2000 + value
        : value;
    });

  if (
    new Set(years).size !==
    years.length
  ) {
    return null;
  }

  return years;
}

const fieldMappings = [
  {
    field: "revenue",
    labels: [
      /^Total revenue\b/i,
      /^Revenue\b/i
    ]
  },
  {
    field: "ebitda",
    labels: [
      /^EBITDA\b/i
    ]
  },
  {
    field: "operatingIncome",
    labels: [
      /^Operating profit\b/i,
      /^EBIT\b/i
    ]
  },
  {
    field: "netIncome",
    labels: [
      /^Equity holders of (?:the )?parent\b/i,
      /^Owners of (?:the )?parent\b/i,
      /^Profit attributable to (?:equity holders|owners) of (?:the )?parent\b/i
    ]
  },
  {
    field: "earningsPerShare",
    labels: [
      /^Basic(?: and diluted)? earnings per share\b/i,
      /^Basic EPS\b/i
    ]
  },
  {
    field: "freeCashFlow",
    labels: [
      /^Free cash flow\b/i
    ]
  },
  {
    field: "dividendPerShare",
    labels: [
      /^Ordinary dividend per share\b/i,
      /^Dividend(?:s)? per share\b/i
    ]
  }
];

const loadingTask =
  pdfjsLib.getDocument({
    data: new Uint8Array(buffer)
  });

const pdf =
  await loadingTask.promise;

console.log(
  `PAGE_COUNT=${pdf.numPages}`
);

const candidates = [];

for (
  let pageNumber = 1;
  pageNumber <= pdf.numPages;
  pageNumber += 1
) {
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

  if (normalizeText(currentLine)) {
    lines.push(
      normalizeText(currentLine)
    );
  }

  const pageText =
    lines.join(" ");

  if (
    !/\bfinancial highlights\b/i.test(
      pageText
    )
  ) {
    continue;
  }

  const unitStrict =
    /\bKShs[’']?\s*Mn\b/i.test(
      pageText
    );

  const unitLoose =
    /KShs/i.test(pageText) &&
    /\bMn\b/i.test(pageText);

  const fyLines =
    lines
      .map((line, index) => ({
        index,
        line,
        years:
          parseFiscalYearHeader(line)
      }))
      .filter(row =>
        Array.isArray(row.years)
      );

  const currentFyPresent =
    fyLines.some(row =>
      row.years.includes(2024)
    );

  const matchedFields = [];

  for (const mapping of fieldMappings) {
    const matching =
      lines
        .map((line, index) => ({
          index,
          line
        }))
        .filter(row =>
          mapping.labels.some(regex =>
            regex.test(row.line)
          )
        );

    if (matching.length) {
      matchedFields.push({
        field: mapping.field,
        matching
      });
    }
  }

  const diagnostic = {
    pageNumber,
    lineCount: lines.length,
    financialHighlights: true,
    unitStrict,
    unitLoose,
    fyHeaderCount: fyLines.length,
    fyLines,
    currentFyPresent,
    matchedFieldCount:
      matchedFields.length,
    matchedFields
  };

  candidates.push(diagnostic);

  console.log("");
  console.log(
    `===== FINANCIAL HIGHLIGHTS PAGE ${pageNumber} =====`
  );

  console.log(
    JSON.stringify(
      {
        pageNumber,
        lineCount: lines.length,
        unitStrict,
        unitLoose,
        fyHeaderCount:
          fyLines.length,
        currentFyPresent,
        matchedFieldCount:
          matchedFields.length
      },
      null,
      2
    )
  );

  console.log("");
  console.log("----- FY HEADER LINES -----");

  if (fyLines.length === 0) {
    console.log("NONE");
  } else {
    for (const row of fyLines) {
      console.log(
        JSON.stringify(row)
      );
    }
  }

  console.log("");
  console.log("----- MATCHED FIELD LINES -----");

  if (matchedFields.length === 0) {
    console.log("NONE");
  } else {
    for (const row of matchedFields) {
      console.log(
        JSON.stringify(row)
      );
    }
  }

  console.log("");
  console.log("----- RELEVANT RAW LINES -----");

  lines.forEach((line, index) => {
    if (
      /financial highlights/i.test(line) ||
      /KShs/i.test(line) ||
      /\bFY\d{2,4}\b/i.test(line) ||
      /revenue/i.test(line) ||
      /EBITDA/i.test(line) ||
      /operating profit/i.test(line) ||
      /equity holders/i.test(line) ||
      /earnings per share/i.test(line) ||
      /\bEPS\b/i.test(line) ||
      /free cash flow/i.test(line) ||
      /dividend/i.test(line) ||
      /\bDPS\b/i.test(line)
    ) {
      console.log(
        `${index}: ${JSON.stringify(line)}`
      );
    }
  });
}

console.log("");
console.log("===== CANDIDATE SUMMARY =====");

console.log(
  JSON.stringify(
    candidates.map(row => ({
      pageNumber:
        row.pageNumber,
      unitStrict:
        row.unitStrict,
      unitLoose:
        row.unitLoose,
      fyHeaderCount:
        row.fyHeaderCount,
      currentFyPresent:
        row.currentFyPresent,
      matchedFieldCount:
        row.matchedFieldCount
    })),
    null,
    2
  )
);

const page110 =
  candidates.find(
    row =>
      row.pageNumber === 110
  );

console.log("");
console.log(
  `PAGE_110_FOUND=${page110 ? 1 : 0}`
);

if (page110) {
  console.log(
    `PAGE_110_UNIT_STRICT=${page110.unitStrict ? 1 : 0}`
  );

  console.log(
    `PAGE_110_UNIT_LOOSE=${page110.unitLoose ? 1 : 0}`
  );

  console.log(
    `PAGE_110_FY_HEADER_COUNT=${page110.fyHeaderCount}`
  );

  console.log(
    `PAGE_110_CURRENT_FY=${page110.currentFyPresent ? 1 : 0}`
  );

  console.log(
    `PAGE_110_MATCHED_FIELDS=${page110.matchedFieldCount}`
  );
}

await pdf.destroy();

console.log("");
console.log(
  "PC-POSTPROD-UAT-005C2C6L3B RESULT: DISCOVERY PASS"
);
