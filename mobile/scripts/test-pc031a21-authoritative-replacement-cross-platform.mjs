import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  // latin1 intentionally tolerates the legacy Windows-1252 byte(s)
  // currently present in some GateCEP source files.
  return fs.readFileSync(path.join(root, rel), "latin1");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return false;
  }

  console.log(`PASS: ${message}`);
  return true;
}

function occurrences(text, pattern) {
  if (typeof pattern === "string") {
    return text.split(pattern).length - 1;
  }

  return [...text.matchAll(pattern)].length;
}

console.log("===== PC-031A21 RUNTIME CONTRACT =====");

const transactionsUpload = read("app/transactions-upload.js");
const transactionImport = read("app/transaction-import.js");
const funds = read("app/(tabs)/funds.js");

const pdfApi = read(
  "src/services/brokers/brokerPdfExtractionApi.js"
);

const importSecurity = read(
  "src/security/importFileSecurity.js"
);

const importInfoWeb = read(
  "src/security/importFileInfo.web.js"
);

const importInfoNative = read(
  "src/security/importFileInfo.native.js"
);

const transactionFiles = [
  ["Transactions Upload", transactionsUpload],
  ["Transaction Import", transactionImport]
];

const crossPlatformFiles = [
  ["Transactions Upload", transactionsUpload],
  ["Transaction Import", transactionImport],
  ["Funds Import", funds]
];

console.log();
console.log("----- WEB CSV / XLS / XLSX -----");

for (const [name, source] of crossPlatformFiles) {
  assert(
    source.includes(
      'typeof file.file.text === "function"'
    ) &&
      source.includes(
        "return await file.file.text()"
      ),
    `${name}: web CSV prefers browser File.text()`
  );

  assert(
    source.includes(
      'typeof file.file.arrayBuffer === "function"'
    ) &&
      source.includes(
        "arrayBuffer = await file.file.arrayBuffer()"
      ),
    `${name}: web XLS/XLSX prefers browser File.arrayBuffer()`
  );

  assert(
    occurrences(source, "fetch(file.uri)") >= 2,
    `${name}: web picker URI fallback remains available`
  );

  assert(
    source.includes(
      'throw new Error("The selected broker file could not be opened.")'
    ),
    `${name}: failed web file reads fail visibly`
  );
}

console.log();
console.log("----- ANDROID / IOS CSV / XLS / XLSX -----");

for (const [name, source] of crossPlatformFiles) {
  assert(
    source.includes(
      "FileSystem.readAsStringAsync(file.uri"
    ),
    `${name}: native file URI uses Expo FileSystem`
  );

  assert(
    source.includes(
      "FileSystem.EncodingType.UTF8"
    ),
    `${name}: native CSV reads UTF8`
  );

  assert(
    source.includes(
      "FileSystem.EncodingType.Base64"
    ),
    `${name}: native XLS/XLSX reads Base64`
  );
}

console.log();
console.log("----- PDF CROSS-PLATFORM -----");

assert(
  pdfApi.includes(
    'Platform.OS === "web" && file.file'
  ) &&
    pdfApi.includes(
      'form.append("file", file.file, file.name)'
    ),
  "PDF web upload uses browser File in FormData"
);

assert(
  pdfApi.includes(
    'form.append("file", { uri: file.uri, name: file.name, type: "application/pdf" })'
  ),
  "PDF Android/iOS upload uses URI/name/MIME FormData object"
);

assert(
  pdfApi.includes(
    '/broker-reports/extract-pdf'
  ),
  "PDF web/mobile paths converge on the same extraction API"
);

console.log();
console.log("----- PLATFORM FILE METADATA -----");

assert(
  importInfoWeb.includes(
    'source: "WEB_FILE"'
  ) &&
    importInfoWeb.includes(
      "file?.file?.size"
    ),
  "Web import security can validate browser File size"
);

assert(
  importInfoWeb.includes(
    'source: "WEB_BLOB"'
  ) &&
    importInfoWeb.includes(
      "await response.blob()"
    ),
  "Web import security retains blob fallback"
);

assert(
  importInfoNative.includes(
    "FileSystem.getInfoAsync(file.uri"
  ) &&
    importInfoNative.includes(
      'source: "NATIVE_FILE_SYSTEM"'
    ),
  "Native import security validates local URI through FileSystem"
);

console.log();
console.log("----- SUPPORTED BROKER FILE TYPES -----");

for (const extension of [
  '".csv"',
  '".xls"',
  '".xlsx"',
  '".pdf"'
]) {
  assert(
    importSecurity.includes(extension),
    `Secure import contract allows ${extension.replaceAll('"', "")}`
  );
}

assert(
  importSecurity.includes(
    "MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024"
  ),
  "Secure import retains 5 MB file limit"
);

assert(
  importSecurity.includes(
    "MAX_IMPORT_ROWS = 10000"
  ),
  "Secure import retains 10,000 row limit"
);

console.log();
console.log("----- AUTHORITATIVE REPLACEMENT SEMANTICS -----");

for (const [name, source] of transactionFiles) {
  const replacementWrites = occurrences(
    source,
    'userSetItem("transactionHistory", JSON.stringify(verified))'
  );

  assert(
    replacementWrites === 1,
    `${name}: verified transactionHistory is replaced exactly once`
  );

  const unverifiedWrites = occurrences(
    source,
    'userSetItem("unverifiedTransactionHistory", JSON.stringify(unverified))'
  );

  assert(
    unverifiedWrites === 1,
    `${name}: unverified transaction set is replaced exactly once`
  );

  assert(
    !source.includes(
      'userGetItem("transactionHistory"'
    ),
    `${name}: upload path does not read old transactionHistory for append/merge`
  );

  assert(
    !source.includes(
      'JSON.parse(await userGetItem("transactionHistory"'
    ),
    `${name}: old imported evidence is not merged into the new upload`
  );

  const rebuildInvocations = occurrences(
    source,
    "await rebuildCanonicalPortfolioLedger()"
  );

  assert(
    rebuildInvocations === 1,
    `${name}: canonical portfolio ledger rebuild executes exactly once`
  );

  assert(
    source.includes(
      "partitionBrokerExecutionEvidence"
    ),
    `${name}: broker evidence is classified before replacement`
  );
}

console.log();
console.log("----- ACCOUNTING BOUNDARY SOURCE CONTRACT -----");

const canonicalLedger = read(
  "src/features/trading/canonicalPortfolioLedgerService.js"
);

assert(
  canonicalLedger.includes(
    "row.canAffectRealPortfolio === true"
  ),
  "Canonical REAL accounting requires explicit canAffectRealPortfolio === true"
);

assert(
  canonicalLedger.includes(
    "isCompletedLotExecution"
  ),
  "Canonical REAL accounting requires completed execution evidence"
);

assert(
  !canonicalLedger.includes(
    "canAffectRealPortfolio !== false"
  ),
  "Canonical ledger does not use permissive missing-flag accounting"
);

console.log();
console.log("----- RESULT -----");

if (process.exitCode) {
  console.error(
    "PC-031A21 AUTHORITATIVE REPLACEMENT + CROSS-PLATFORM CONTRACT FAILED"
  );
  process.exit(process.exitCode);
}

console.log(
  "PASS: PC-031A21 authoritative replacement + cross-platform upload contract."
);
