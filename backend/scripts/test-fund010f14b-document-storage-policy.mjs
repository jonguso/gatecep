import assert from "node:assert/strict";

import {
  buildFundamentalDocumentStorageIdentity
} from "../src/modules/fundamental-evidence/fundamentalDocumentStorage.policy.js";

console.log(
  "===== FUND-010F14B — DOCUMENT STORAGE POLICY TEST ====="
);

const kcb =
  buildFundamentalDocumentStorageIdentity({
    symbol: "KCB",
    fiscalYear: 2025,
    filingType: "ANNUAL_REPORT",
    source: "CMA"
  });

assert.deepEqual(
  kcb,
  {
    symbol: "KCB",
    fiscalYear: 2025,
    filingType: "ANNUAL_REPORT",
    source: "CMA",
    fileName:
      "KCB_2025_ANNUAL_REPORT_CMA.pdf",
    relativePath:
      "fundamental-documents/KCB/2025/KCB_2025_ANNUAL_REPORT_CMA.pdf"
  }
);

console.log(
  "PASS — KCB canonical document identity."
);

const eqt =
  buildFundamentalDocumentStorageIdentity({
    symbol: "eqt",
    fiscalYear: "2025",
    filingType: "annual report",
    source: "cma"
  });

assert.equal(
  eqt.fileName,
  "EQT_2025_ANNUAL_REPORT_CMA.pdf"
);

console.log(
  "PASS — EQT normalization."
);

const coop =
  buildFundamentalDocumentStorageIdentity({
    symbol: "COOP",
    fiscalYear: 2025,
    source: "CMA"
  });

assert.equal(
  coop.relativePath,
  "fundamental-documents/COOP/2025/COOP_2025_ANNUAL_REPORT_CMA.pdf"
);

console.log(
  "PASS — COOP canonical path."
);

assert.throws(
  () =>
    buildFundamentalDocumentStorageIdentity({
      symbol: "../KCB",
      fiscalYear: 2025,
      source: "CMA"
    }),
  /canonical NSE security symbol/
);

console.log(
  "PASS — traversal-style symbol rejected."
);

assert.throws(
  () =>
    buildFundamentalDocumentStorageIdentity({
      symbol: "KCB",
      fiscalYear: "../2025",
      source: "CMA"
    }),
  /valid filing fiscal year/
);

console.log(
  "PASS — invalid fiscal year rejected."
);

assert.throws(
  () =>
    buildFundamentalDocumentStorageIdentity({
      symbol: "KCB",
      fiscalYear: 2025,
      source: ""
    }),
  /canonical document source/
);

console.log(
  "PASS — missing source fails closed."
);

console.log(
  JSON.stringify(
    {
      kcb,
      eqt,
      coop
    },
    null,
    2
  )
);

console.log(
  "F10F14B_DIRECTORY_CREATION=NONE"
);
console.log(
  "F10F14B_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14B_DOCUMENT_DOWNLOAD=NONE"
);
console.log(
  "F10F14B_PROVIDER_CALL=NONE"
);
console.log(
  "F10F14B_PROVIDER_COST=ZERO"
);
console.log(
  "F10F14B_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14B_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14B_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14B PASS ====="
);
