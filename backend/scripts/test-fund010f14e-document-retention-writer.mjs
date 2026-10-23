import assert from "node:assert/strict";

import {
  mkdtemp,
  readFile,
  rm
} from "node:fs/promises";

import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

import {
  evaluateFundamentalDocumentRetention
} from "../src/modules/fundamental-evidence/fundamentalDocumentRetention.policy.js";

import {
  retainValidatedFundamentalDocument
} from "../src/modules/fundamental-evidence/fundamentalDocumentRetention.writer.js";

console.log(
  "===== FUND-010F14E — RETENTION WRITER TEST ====="
);

const root =
  await mkdtemp(
    path.join(
      os.tmpdir(),
      "gatecep-f14e-"
    )
  );

try {
  const retrieval = {
    persistence: "NONE",
    verifiedFiling: false,
    verified: false,
    authoritative: false
  };

  const identity = {
    identityStatus:
      "IDENTIFIED",
    symbol:
      "KCB",
    fiscalYear:
      2025,
    filingType:
      "ANNUAL_REPORT"
  };

  const retention =
    evaluateFundamentalDocumentRetention({
      expectedSymbol:
        "KCB",
      expectedFiscalYear:
        2025,
      expectedFilingType:
        "ANNUAL_REPORT",
      source:
        "CMA",
      identity,
      retrieval
    });

  assert.equal(
    retention.eligible,
    true
  );

  const documentBuffer =
    Buffer.from(
      "%PDF-1.7\n" +
      "FUND-010F14E TEST DOCUMENT\n" +
      "%%EOF\n",
      "utf8"
    );

  const expectedHash =
    crypto
      .createHash("sha256")
      .update(documentBuffer)
      .digest("hex");

  const first =
    await retainValidatedFundamentalDocument({
      retention,
      documentBuffer,
      storageRoot:
        root
    });

  assert.equal(
    first.retained,
    true
  );

  assert.equal(
    first.created,
    true
  );

  assert.equal(
    first.idempotent,
    false
  );

  assert.equal(
    first.contentHash,
    expectedHash
  );

  console.log(
    "PASS — validated document retained."
  );

  const target =
    path.join(
      root,
      retention
        .storageIdentity
        .relativePath
    );

  const stored =
    await readFile(target);

  assert.deepEqual(
    stored,
    documentBuffer
  );

  console.log(
    "PASS — retained bytes exactly match source buffer."
  );

  const second =
    await retainValidatedFundamentalDocument({
      retention,
      documentBuffer,
      storageRoot:
        root
    });

  assert.equal(
    second.created,
    false
  );

  assert.equal(
    second.idempotent,
    true
  );

  assert.equal(
    second.contentHash,
    expectedHash
  );

  console.log(
    "PASS — same-content retention is idempotent."
  );

  await assert.rejects(
    () =>
      retainValidatedFundamentalDocument({
        retention,
        documentBuffer:
          Buffer.from(
            "%PDF-1.7\nDIFFERENT CONTENT\n%%EOF\n"
          ),
        storageRoot:
          root
      }),
    /already contains different content/
  );

  console.log(
    "PASS — canonical-path content collision fails closed."
  );

  await assert.rejects(
    () =>
      retainValidatedFundamentalDocument({
        retention: {
          ...retention,
          eligible:
            false
        },
        documentBuffer,
        storageRoot:
          root
      }),
    /not eligible for retention/
  );

  console.log(
    "PASS — ineligible document cannot be written."
  );

  await assert.rejects(
    () =>
      retainValidatedFundamentalDocument({
        retention: {
          ...retention,
          storageIdentity: {
            ...retention.storageIdentity,
            relativePath:
              "../escape.pdf"
          }
        },
        documentBuffer,
        storageRoot:
          root
      }),
    /escaped its configured root/
  );

  console.log(
    "PASS — storage-root traversal fails closed."
  );

  console.log(
    JSON.stringify(
      {
        relativePath:
          first.relativePath,
        contentHash:
          first.contentHash,
        sizeBytes:
          first.sizeBytes,
        firstCreated:
          first.created,
        secondIdempotent:
          second.idempotent
      },
      null,
      2
    )
  );

  console.log(
    "F10F14E_PRODUCTION_STORAGE_WRITE=NONE"
  );
  console.log(
    "F10F14E_TEST_STORAGE=OS_TEMP_ONLY"
  );
  console.log(
    "F10F14E_DOCUMENT_DOWNLOAD=NONE"
  );
  console.log(
    "F10F14E_PROVIDER_CALL=NONE"
  );
  console.log(
    "F10F14E_PROVIDER_COST=ZERO"
  );
  console.log(
    "F10F14E_DATABASE_MUTATION=NONE"
  );
  console.log(
    "F10F14E_FUNDAMENTAL_MUTATION=NONE"
  );
  console.log(
    "F10F14E_APPROVAL=NONE"
  );
  console.log(
    "F10F14E_PROMOTION=NONE"
  );
  console.log(
    "F10F14E_PUBLICATION=NONE"
  );

  console.log(
    "===== FUND-010F14E PASS ====="
  );
} finally {
  await rm(
    root,
    {
      recursive: true,
      force: true
    }
  );
}
