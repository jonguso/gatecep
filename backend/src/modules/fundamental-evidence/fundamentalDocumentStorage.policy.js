import path from "node:path";

function clean(value) {
  return String(value ?? "").trim();
}

function canonicalSymbol(value) {
  const symbol =
    clean(value).toUpperCase();

  if (!/^[A-Z0-9]+$/.test(symbol)) {
    throw new Error(
      "A canonical NSE security symbol is required."
    );
  }

  return symbol;
}

function canonicalFiscalYear(value) {
  const year =
    Number(value);

  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2200
  ) {
    throw new Error(
      "A valid filing fiscal year is required."
    );
  }

  return year;
}

function canonicalFilingType(value) {
  const filingType =
    clean(value)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  if (!filingType) {
    throw new Error(
      "A canonical filing type is required."
    );
  }

  return filingType;
}

function canonicalSource(value) {
  const source =
    clean(value)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  if (!source) {
    throw new Error(
      "A canonical document source is required."
    );
  }

  return source;
}

export function buildFundamentalDocumentStorageIdentity({
  symbol,
  fiscalYear,
  filingType = "ANNUAL_REPORT",
  source
} = {}) {
  const normalizedSymbol =
    canonicalSymbol(symbol);

  const normalizedFiscalYear =
    canonicalFiscalYear(fiscalYear);

  const normalizedFilingType =
    canonicalFilingType(filingType);

  const normalizedSource =
    canonicalSource(source);

  const fileName =
    [
      normalizedSymbol,
      normalizedFiscalYear,
      normalizedFilingType,
      normalizedSource
    ].join("_") + ".pdf";

  const relativePath =
    path.posix.join(
      "fundamental-documents",
      normalizedSymbol,
      String(normalizedFiscalYear),
      fileName
    );

  return {
    symbol:
      normalizedSymbol,

    fiscalYear:
      normalizedFiscalYear,

    filingType:
      normalizedFilingType,

    source:
      normalizedSource,

    fileName,

    relativePath
  };
}

export default {
  buildFundamentalDocumentStorageIdentity
};
