import * as FileSystem from "expo-file-system/legacy";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 10000;

const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx", ".pdf"];

export async function requireSafeImportFile(file) {
  const name = String(file?.name || "").trim();
  const lowerName = name.toLowerCase();

  if (!ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    throw new Error("Only PDF, CSV, XLS, and XLSX broker files are supported.");
  }

  let size = Number(file?.size);

  if ((!Number.isFinite(size) || size <= 0) && file?.uri) {
    try {
      const info = await FileSystem.getInfoAsync(file.uri, { size: true });
      size = Number(info?.size);
    } catch {
      size = 0;
    }
  }

  if (Number.isFinite(size) && size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("The broker file exceeds the 5 MB secure import limit.");
  }

  return file;
}

export function safeWorkbookReadOptions(type) {
  return {
    type,
    dense: true,
    sheetRows: MAX_IMPORT_ROWS + 1,
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    bookVBA: false
  };
}

export function requireSafeImportRows(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("The broker file did not produce a valid row collection.");
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`The broker file exceeds the ${MAX_IMPORT_ROWS.toLocaleString()} row secure import limit.`);
  }

  return rows;
}
