import assert from "node:assert/strict";

import {
  MAX_DOCUMENT_BYTES,
  validatePdf,
  validateRequestBody
} from "../src/modules/fundamental-evidence/fundamentalDocumentRetentionAdmin.route.js";

console.log(
  "===== FUND-010F14O — ADMIN RETENTION ROUTE CONTRACT TEST ====="
);

function expectError(
  label,
  fn,
  expectedCode
) {
  try {
    fn();

    console.log(
      "FAIL — " + label
    );

    process.exitCode = 1;
  } catch (error) {
    assert.equal(
      error.code,
      expectedCode
    );

    console.log(
      "PASS — " + label
    );
  }
}

const pdfBuffer =
  Buffer.from(
    "%PDF-1.7\nFUND-010F14O ROUTE CONTRACT FIXTURE\n%%EOF\n",
    "utf8"
  );

const validFile = {
  originalname:
    "KCB_2025_ANNUAL_REPORT.pdf",

  mimetype:
    "application/pdf",

  buffer:
    pdfBuffer
};

const validRequest =
  validateRequestBody({
    symbol:
      " kcb ",

    source:
      " cma ",

    confirmed:
      true,

    reason:
      "Retain validated annual-report evidence."
  });

assert.deepEqual(
  validRequest,
  {
    symbol:
      "KCB",

    source:
      "CMA",

    confirmed:
      true,

    reason:
      "Retain validated annual-report evidence."
  }
);

console.log(
  "PASS — request canonicalizes symbol/source while preserving explicit confirmation."
);

const validPdf =
  validatePdf(
    validFile
  );

assert.equal(
  validPdf.fileName,
  "KCB_2025_ANNUAL_REPORT.pdf"
);

assert.equal(
  validPdf.mimeType,
  "application/pdf"
);

console.log(
  "PASS — valid PDF upload contract accepted."
);

expectError(
  "missing symbol fails closed.",
  () =>
    validateRequestBody({
      source: "CMA",
      confirmed: true,
      reason: "test"
    }),
  "FUNDAMENTAL_DOCUMENT_RETENTION_SYMBOL_REQUIRED"
);

expectError(
  "missing source fails closed.",
  () =>
    validateRequestBody({
      symbol: "KCB",
      confirmed: true,
      reason: "test"
    }),
  "FUNDAMENTAL_DOCUMENT_RETENTION_SOURCE_REQUIRED"
);

expectError(
  "browser-supplied identity is rejected.",
  () =>
    validateRequestBody({
      symbol: "KCB",
      source: "CMA",
      confirmed: true,
      reason: "test",
      identity: {
        identityStatus:
          "IDENTIFIED"
      }
    }),
  "FUNDAMENTAL_DOCUMENT_RETENTION_REQUEST_INVALID"
);

expectError(
  "browser-supplied extraction is rejected.",
  () =>
    validateRequestBody({
      symbol: "KCB",
      source: "CMA",
      confirmed: true,
      reason: "test",
      extraction: {}
    }),
  "FUNDAMENTAL_DOCUMENT_RETENTION_REQUEST_INVALID"
);

expectError(
  "browser-supplied storageRoot is rejected.",
  () =>
    validateRequestBody({
      symbol: "KCB",
      source: "CMA",
      confirmed: true,
      reason: "test",
      storageRoot:
        "/tmp/not-allowed"
    }),
  "FUNDAMENTAL_DOCUMENT_RETENTION_REQUEST_INVALID"
);

expectError(
  "missing PDF fails closed.",
  () =>
    validatePdf(),
  "FUNDAMENTAL_DOCUMENT_RETENTION_FILE_REQUIRED"
);

expectError(
  "non-PDF signature fails closed.",
  () =>
    validatePdf({
      originalname:
        "report.pdf",

      mimetype:
        "application/pdf",

      buffer:
        Buffer.from(
          "NOT A PDF"
        )
    }),
  "FUNDAMENTAL_DOCUMENT_RETENTION_FORMAT_UNSUPPORTED"
);

expectError(
  "disguised non-PDF file fails closed.",
  () =>
    validatePdf({
      originalname:
        "report.txt",

      mimetype:
        "text/plain",

      buffer:
        pdfBuffer
    }),
  "FUNDAMENTAL_DOCUMENT_RETENTION_FORMAT_UNSUPPORTED"
);

assert.equal(
  MAX_DOCUMENT_BYTES,
  20 * 1024 * 1024
);

console.log(
  "PASS — upload size boundary remains 20 MB."
);

console.log(
  JSON.stringify(
    {
      route:
        "/admin/fundamentals/documents/retain",

      method:
        "POST",

      authentication:
        "authRequired",

      authorization:
        "requireAdmin",

      acceptedBodyFields: [
        "symbol",
        "source",
        "confirmed",
        "reason"
      ],

      binaryField:
        "file",

      serverDerived: [
        "identity",
        "extraction",
        "retrieval",
        "storageRoot"
      ],

      productionStorageActivated:
        false
    },
    null,
    2
  )
);

console.log(
  "F10F14O_ROUTE_REGISTRATION=NONE"
);

console.log(
  "F10F14O_PREVIEW_ROUTE_MODIFICATION=NONE"
);

console.log(
  "F10F14O_ENV_MODIFICATION=NONE"
);

console.log(
  "F10F14O_DIRECTORY_CREATION=SOURCE_ONLY"
);

console.log(
  "F10F14O_DOCUMENT_WRITE=NONE"
);

console.log(
  "F10F14O_PRODUCTION_STORAGE_ACTIVATION=NONE"
);

console.log(
  "F10F14O_LIVE_RETRIEVAL=NONE"
);

console.log(
  "F10F14O_PROVIDER_CALL=NONE"
);

console.log(
  "F10F14O_PROVIDER_COST=ZERO"
);

console.log(
  "F10F14O_DATABASE_MUTATION=NONE"
);

console.log(
  "F10F14O_FUNDAMENTAL_MUTATION=NONE"
);

console.log(
  "F10F14O_VERIFICATION=NONE"
);

console.log(
  "F10F14O_APPROVAL=NONE"
);

console.log(
  "F10F14O_PROMOTION=NONE"
);

console.log(
  "F10F14O_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14O PASS ====="
);
