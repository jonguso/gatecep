import XLSX from "xlsx";

import {
  extractBrokerPdf
} from "../../services/brokerReports/brokerPdfExtraction.service.js";

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function normalizeKey(value) {
  return upper(value)
    .replace(/[^A-Z0-9]/g, "");
}

function fileExtension(fileName = "") {
  const match =
    clean(fileName)
      .toLowerCase()
      .match(/(\.[a-z0-9]+)$/);

  return match?.[1] || "";
}

function firstRowIdentity(rows = []) {
  const first =
    rows.find(
      (row) =>
        row &&
        typeof row === "object" &&
        Object.keys(row).length
    ) || {};

  const entries =
    Object.entries(first).reduce(
      (result, [key, value]) => {
        result[normalizeKey(key)] =
          clean(value);

        return result;
      },
      {}
    );

  return {
    brokerId:
      entries.MEMBERCODE ||
      entries.BROKERCODE ||
      entries.BROKERID ||
      null,

    tradingAccount:
      entries.TRADINGACCOUNT ||
      entries.ACCOUNTNUMBER ||
      entries.CDSNUMBER ||
      entries.CDSACCOUNT ||
      null,

    clientCode:
      entries.CLIENTCODE ||
      entries.CLIENTNUMBER ||
      null,

    clientName:
      entries.CLIENTNAME ||
      entries.ACCOUNTHOLDER ||
      null
  };
}

function extractEmbeddedStatementIdentity(
  rows = []
) {
  const text =
    rows
      .flatMap(
        (row) =>
          Object.entries(row || {}).flat()
      )
      .map(clean)
      .filter(Boolean)
      .join(" | ");

  return {
    tradingAccount:
      text.match(
        /\bAcc(?:ount)?\.?\s*[:#-]?\s*(\d{5,})\b/i
      )?.[1] || null,

    clientCode:
      text.match(
        /\bClient(?:\s+(?:Code|Number|No\.?))?\s*[:#-]?\s*(\d{4,})\b/i
      )?.[1] || null
  };
}

function spreadsheetIdentity(
  rows,
  reportType
) {
  const first =
    firstRowIdentity(rows);

  const embedded =
    extractEmbeddedStatementIdentity(rows);

  /*
   * Transaction / order-history identity must follow the
   * same field semantics as the proven investor upload path.
   *
   * For transaction evidence:
   *   broker       = MEMBERCODE / BROKERCODE
   *   client       = CLIENTCODE / CLIENTNUMBER
   *   CDS account  = TRADINGACCOUNT / ACCOUNTNUMBER
   *
   * Do not reinterpret generic CDSNUMBER / CDSACCOUNT
   * columns as the transaction trading-account field.
   */
  if (reportType === "transactions") {
    const firstRow =
      rows.find(
        (row) =>
          row &&
          typeof row === "object" &&
          Object.keys(row).length
      ) || {};

    const entries =
      Object.entries(firstRow).reduce(
        (result, [key, value]) => {
          result[normalizeKey(key)] =
            clean(value);

          return result;
        },
        {}
      );

    return {
      brokerId:
        entries.MEMBERCODE ||
        entries.BROKERCODE ||
        null,

      clientCode:
        entries.CLIENTCODE ||
        entries.CLIENTNUMBER ||
        null,

      tradingAccount:
        entries.TRADINGACCOUNT ||
        entries.ACCOUNTNUMBER ||
        null,

      clientName:
        entries.CLIENTNAME ||
        entries.ACCOUNTHOLDER ||
        null,

      source:
        "TRANSACTION_COLUMNS"
    };
  }

  return {
    brokerId:
      first.brokerId || null,

    clientCode:
      first.clientCode ||
      embedded.clientCode ||
      null,

    tradingAccount:
      first.tradingAccount ||
      embedded.tradingAccount ||
      null,

    clientName:
      first.clientName || null,

    source:
      "SPREADSHEET_CONTENT"
  };
}

const MAX_STRUCTURED_ROWS = 10_000;
const MAX_STRUCTURED_COLUMNS = 100;

function structuredEvidenceTooLarge(
  message
) {
  return Object.assign(
    new Error(message),
    {
      statusCode: 413,
      code:
        "RECONCILIATION_EVIDENCE_STRUCTURE_TOO_LARGE"
    }
  );
}

function readSpreadsheetRows(buffer) {
  const workbook =
    XLSX.read(buffer, {
      type: "buffer"
    });

  const sheetName =
    workbook.SheetNames?.[0];

  if (!sheetName) {
    throw Object.assign(
      new Error(
        "The spreadsheet does not contain a readable worksheet."
      ),
      {
        statusCode: 422,
        code:
          "RECONCILIATION_EVIDENCE_EMPTY"
      }
    );
  }

  const sheet =
    workbook.Sheets[sheetName];

  const worksheetRange =
    String(sheet?.["!ref"] || "")
      .trim();

  if (!worksheetRange) {
    throw Object.assign(
      new Error(
        "The spreadsheet does not contain a readable worksheet range."
      ),
      {
        statusCode: 422,
        code:
          "RECONCILIATION_EVIDENCE_EMPTY"
      }
    );
  }

  let decodedRange;

  try {
    decodedRange =
      XLSX.utils.decode_range(
        worksheetRange
      );
  } catch {
    throw Object.assign(
      new Error(
        "The spreadsheet worksheet range is invalid."
      ),
      {
        statusCode: 422,
        code:
          "RECONCILIATION_EVIDENCE_INVALID"
      }
    );
  }

  const worksheetRowCount =
    decodedRange.e.r -
    decodedRange.s.r +
    1;

  const worksheetColumnCount =
    decodedRange.e.c -
    decodedRange.s.c +
    1;

  if (
    worksheetRowCount >
      MAX_STRUCTURED_ROWS
  ) {
    throw structuredEvidenceTooLarge(
      `Structured broker evidence exceeds the ${MAX_STRUCTURED_ROWS} row safety limit.`
    );
  }

  if (
    worksheetColumnCount >
      MAX_STRUCTURED_COLUMNS
  ) {
    throw structuredEvidenceTooLarge(
      `Structured broker evidence exceeds the ${MAX_STRUCTURED_COLUMNS} column safety limit.`
    );
  }

  const rows =
    XLSX.utils.sheet_to_json(
      sheet,
      {
        defval: ""
      }
    );

  if (!rows.length) {
    throw Object.assign(
      new Error(
        "No structured broker records could be extracted from this spreadsheet."
      ),
      {
        statusCode: 422,
        code:
          "RECONCILIATION_EVIDENCE_EMPTY"
      }
    );
  }

  return rows;
}

export async function extractAdminReconciliationEvidence({
  buffer,
  fileName,
  mimeType,
  reportType
} = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw Object.assign(
      new Error(
        "Evidence file buffer is required."
      ),
      {
        statusCode: 400,
        code:
          "RECONCILIATION_EVIDENCE_REQUIRED"
      }
    );
  }

  const normalizedReportType =
    clean(reportType).toLowerCase();

  if (
    ![
      "valuation",
      "cash",
      "transactions"
    ].includes(normalizedReportType)
  ) {
    throw Object.assign(
      new Error(
        "Unsupported reconciliation report type."
      ),
      {
        statusCode: 400,
        code:
          "RECONCILIATION_REPORT_TYPE_UNSUPPORTED"
      }
    );
  }

  const extension =
    fileExtension(fileName);

  if (extension === ".pdf") {
    if (
      normalizedReportType ===
      "transactions"
    ) {
      const extracted =
        await extractBrokerPdf(
          buffer,
          "orders"
        );

      return {
        ...extracted,
        reportType:
          "transactions",
        fileType:
          "pdf"
      };
    }

    return extractBrokerPdf(
      buffer,
      normalizedReportType
    );
  }

  if (
    ![
      ".csv",
      ".xls",
      ".xlsx"
    ].includes(extension)
  ) {
    throw Object.assign(
      new Error(
        "Evidence must be PDF, CSV, XLS, or XLSX."
      ),
      {
        statusCode: 415,
        code:
          "RECONCILIATION_EVIDENCE_TYPE_UNSUPPORTED"
      }
    );
  }

  const rows =
    readSpreadsheetRows(buffer);

  return {
    reportType:
      normalizedReportType,
    fileType:
      extension.slice(1),
    pageCount: null,
    identity:
      spreadsheetIdentity(
        rows,
        normalizedReportType
      ),
    rows
  };
}
