#!/usr/bin/env node

/*
 * ============================================================
 * PC-026D
 * SAFE FUNDAMENTAL NAVIGATION PATCH
 * ============================================================
 *
 * Replaces router.back() with:
 *
 *   router.replace("/fundamental-data-hub")
 *
 * only in the known fundamental-data pages below.
 *
 * A .pc026d.bak backup is created before each file is changed.
 * ============================================================
 */

const fs =
  require("fs");

const path =
  require("path");

const projectRoot =
  process.cwd();

const targets = [
  "app/fundamental-import.js",
  "app/verified-filings.js",
  "app/filing-extraction.js",
  "app/multi-period-filing-extraction.js",
  "app/filing-import-bridge.js",
  "app/filing-submission-history.js",
  "app/fundamental-operations-center.js"
];

let changed = 0;
let skipped = 0;

targets.forEach(
  (relativePath) => {
    const filePath =
      path.join(
        projectRoot,
        relativePath
      );

    if (
      !fs.existsSync(
        filePath
      )
    ) {
      console.log(
        `SKIP missing: ${relativePath}`
      );

      skipped += 1;
      return;
    }

    const original =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    const updated =
      original.replace(
        /router\.back\(\)/g,
        'router.replace("/fundamental-data-hub")'
      );

    if (
      updated ===
      original
    ) {
      console.log(
        `SKIP no router.back(): ${relativePath}`
      );

      skipped += 1;
      return;
    }

    const backupPath =
      `${filePath}.pc026d.bak`;

    if (
      !fs.existsSync(
        backupPath
      )
    ) {
      fs.writeFileSync(
        backupPath,
        original,
        "utf8"
      );
    }

    fs.writeFileSync(
      filePath,
      updated,
      "utf8"
    );

    console.log(
      `UPDATED: ${relativePath}`
    );

    changed += 1;
  }
);

console.log("");
console.log(
  `PC-026D complete. Updated ${changed} file(s); skipped ${skipped} file(s).`
);
