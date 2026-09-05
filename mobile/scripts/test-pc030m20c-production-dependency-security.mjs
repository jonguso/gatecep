import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const pkg = JSON.parse(await read("package.json"));
const lock = JSON.parse(await read("package-lock.json"));
const policy = await read("src/security/importFileSecurity.js");
const screens = await Promise.all([
  read("app/(tabs)/funds.js"),
  read("app/import-portfolio.js"),
  read("app/transaction-import.js"),
  read("app/transactions-upload.js")
]);

assert.match(pkg.dependencies.axios, /1\.20\.0/);
assert.match(pkg.dependencies.expo, /54\.0\.37/);
assert.equal(lock.packages["node_modules/axios"].version, "1.20.0");
assert.equal(lock.packages["node_modules/expo"].version, "54.0.37");
assert.equal(lock.packages["node_modules/expo-constants"].version, "18.0.14");
assert.equal(lock.packages["node_modules/expo-file-system"].version, "19.0.24");

assert.match(policy, /MAX_IMPORT_FILE_BYTES = 5 \* 1024 \* 1024/);
assert.match(policy, /MAX_IMPORT_ROWS = 10000/);
assert.match(policy, /sheetRows: MAX_IMPORT_ROWS \+ 1/);
assert.match(policy, /cellFormula: false/);
assert.match(policy, /bookVBA: false/);

for (const screen of screens) {
  assert.match(screen, /await requireSafeImportFile\(file\)/);
  assert.match(screen, /safeWorkbookReadOptions/);
  assert.match(screen, /requireSafeImportRows/);
}

console.log("PASS — Axios is upgraded beyond the reported vulnerable range.");
console.log("PASS — Expo SDK 54 dependencies match their compatible patch releases.");
console.log("PASS — every spreadsheet import enforces file-size, row-count, and reduced-parser limits.");
console.log("PASS — the unpatched npm xlsx dependency is explicitly contained pending replacement.");
