import assert from "node:assert/strict";

import {
  mkdtemp,
  readFile,
  readdir,
  rm
} from "node:fs/promises";

import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

import {
  retainValidatedFundamentalFiling
} from "../src/modules/fundamental-evidence/fundamentalDocumentRetention.service.js";

console.log(
  "===== FUND-010F14F — CONTROLLED RETENTION INTEGRATION TEST ====="
);

const root =
  await mkdtemp(
    path.join(
      os.tmpdir(),
      "gatecep-f14f-"
    )
  );

async function listFiles(directory) {
  const result = [];

  async function walk(current) {
    let entries;

    try {
      entries =
        await readdir(
          current,
          {
            withFileTypes: true
          }
        );
    } catch (error) {
      if (error?.code === "ENOENT") {
        return;
      }

      throw error;
    }

    for (const entry of entries) {
      const absolute =
        path.join(
          current,
          entry.name
        );

      if (entry.isDirectory()) {
        await walk(absolute);
      } else {
        result.push(
          path.relative(
            directory,
            absolute
          )
        );
      }
    }
  }

  await walk(directory);

  return result.sort();
}

try {
  const documentBuffer =
    Buffer.from(
      "%PDF-1.7\n" +
      "FUND-010F14F VALIDATED TEST DOCUMENT\n" +
      "%%EOF\n",
      "utf8"
    );

  const expectedHash =
    crypto
      .createHash("sha256")
      .update(documentBuffer)
      .digest("hex");

  /*
   * These fixtures intentionally mirror the already
   * verified F14C contract.
   *
   * No provider or network operation occurs here.
   */
  const validIdentity = {
    identityStatus:
      "IDENTIFIED",
    symbol:
      "KCB",
    fiscalYear:
      2025,
    filingType:
      "ANNUAL_REPORT"
  };

  const retrieval = {
    persistence:
      "NONE",
    verifiedFiling:
      false,
    verified:
      false,
    authoritative:
      false
  };

  const first =
    await retainValidatedFundamentalFiling({
      expectedSymbol:
        "KCB",
      expectedFiscalYear:
        2025,
      expectedFilingType:
        "ANNUAL_REPORT",
      source:
        "CMA",
      identity:
        validIdentity,
      retrieval,
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
    first.reason,
    "VALIDATED_DOCUMENT_RETAINED"
  );

  assert.equal(
    first.contentHash,
    expectedHash
  );

  assert.equal(
    first.retention?.eligible,
    true
  );

  console.log(
    "PASS — eligible validated filing reached retention writer."
  );

  const expectedRelativePath =
    "fundamental-documents/KCB/2025/" +
    "KCB_2025_ANNUAL_REPORT_CMA.pdf";

  assert.equal(
    first.relativePath,
    expectedRelativePath
  );

  const stored =
    await readFile(
      path.join(
        root,
        expectedRelativePath
      )
    );

  assert.deepEqual(
    stored,
    documentBuffer
  );

  console.log(
    "PASS — integrated retention preserved exact validated bytes."
  );

  const second =
    await retainValidatedFundamentalFiling({
      expectedSymbol:
        "KCB",
      expectedFiscalYear:
        2025,
      expectedFilingType:
        "ANNUAL_REPORT",
      source:
        "CMA",
      identity:
        validIdentity,
      retrieval,
      documentBuffer,
      storageRoot:
        root
    });

  assert.equal(
    second.retained,
    true
  );

  assert.equal(
    second.created,
    false
  );

  assert.equal(
    second.idempotent,
    true
  );

  console.log(
    "PASS — integrated repeat retention is idempotent."
  );

  /*
   * Wrong issuer must be stopped by F14C before
   * the writer can mutate storage.
   */
  const beforeWrongIssuer =
    await listFiles(root);

  const wrongIssuer =
    await retainValidatedFundamentalFiling({
      expectedSymbol:
        "KCB",
      expectedFiscalYear:
        2025,
      expectedFilingType:
        "ANNUAL_REPORT",
      source:
        "CMA",
      identity: {
        ...validIdentity,
        symbol:
          "EQT"
      },
      retrieval,
      documentBuffer,
      storageRoot:
        root
    });

  assert.equal(
    wrongIssuer.retained,
    false
  );

  assert.equal(
    wrongIssuer.retention?.eligible,
    false
  );

  assert.deepEqual(
    await listFiles(root),
    beforeWrongIssuer
  );

  console.log(
    "PASS — wrong issuer stopped before filesystem mutation."
  );

  /*
   * Wrong fiscal year must also fail before write.
   */
  const wrongYear =
    await retainValidatedFundamentalFiling({
      expectedSymbol:
        "KCB",
      expectedFiscalYear:
        2025,
      expectedFilingType:
        "ANNUAL_REPORT",
      source:
        "CMA",
      identity: {
        ...validIdentity,
        fiscalYear:
          2024
      },
      retrieval,
      documentBuffer,
      storageRoot:
        root
    });

  assert.equal(
    wrongYear.retained,
    false
  );

  assert.equal(
    wrongYear.retention?.eligible,
    false
  );

  assert.deepEqual(
    await listFiles(root),
    beforeWrongIssuer
  );

  console.log(
    "PASS — wrong fiscal year stopped before filesystem mutation."
  );

  /*
   * Wrong filing type must fail before write.
   */
  const wrongType =
    await retainValidatedFundamentalFiling({
      expectedSymbol:
        "KCB",
      expectedFiscalYear:
        2025,
      expectedFilingType:
        "ANNUAL_REPORT",
      source:
        "CMA",
      identity: {
        ...validIdentity,
        filingType:
          "INTERIM_REPORT"
      },
      retrieval,
      documentBuffer,
      storageRoot:
        root
    });

  assert.equal(
    wrongType.retained,
    false
  );

  assert.equal(
    wrongType.retention?.eligible,
    false
  );

  assert.deepEqual(
    await listFiles(root),
    beforeWrongIssuer
  );

  console.log(
    "PASS — wrong filing type stopped before filesystem mutation."
  );

  /*
   * Unresolved identity must never reach persistence.
   */
  const unresolved =
    await retainValidatedFundamentalFiling({
      expectedSymbol:
        "KCB",
      expectedFiscalYear:
        2025,
      expectedFilingType:
        "ANNUAL_REPORT",
      source:
        "CMA",
      identity: {
        identityStatus:
          "UNRESOLVED"
      },
      retrieval,
      documentBuffer,
      storageRoot:
        root
    });

  assert.equal(
    unresolved.retained,
    false
  );

  assert.equal(
    unresolved.retention?.eligible,
    false
  );

  assert.deepEqual(
    await listFiles(root),
    beforeWrongIssuer
  );

  console.log(
    "PASS — unresolved identity stopped before filesystem mutation."
  );

  /*
   * Writer collision protection must survive integration.
   */
  await assert.rejects(
    () =>
      retainValidatedFundamentalFiling({
        expectedSymbol:
          "KCB",
        expectedFiscalYear:
          2025,
        expectedFilingType:
          "ANNUAL_REPORT",
        source:
          "CMA",
        identity:
          validIdentity,
        retrieval,
        documentBuffer:
          Buffer.from(
            "%PDF-1.7\n" +
            "DIFFERENT F14F CONTENT\n" +
            "%%EOF\n",
            "utf8"
          ),
        storageRoot:
          root
      }),
    /already contains different content/
  );

  console.log(
    "PASS — canonical content collision still fails closed through integration."
  );

  /*
   * Empty bytes must fail before policy/write processing.
   */
  await assert.rejects(
    () =>
      retainValidatedFundamentalFiling({
        expectedSymbol:
          "KCB",
        expectedFiscalYear:
          2025,
        expectedFilingType:
          "ANNUAL_REPORT",
        source:
          "CMA",
        identity:
          validIdentity,
        retrieval,
        documentBuffer:
          Buffer.alloc(0),
        storageRoot:
          root
      }),
    /non-empty validated document buffer/
  );

  console.log(
    "PASS — empty document cannot enter retention integration."
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
        repeatIdempotent:
          second.idempotent,
        wrongIssuerRetained:
          wrongIssuer.retained,
        wrongYearRetained:
          wrongYear.retained,
        wrongTypeRetained:
          wrongType.retained,
        unresolvedRetained:
          unresolved.retained
      },
      null,
      2
    )
  );

  console.log(
    "F10F14F_PRODUCTION_STORAGE_WRITE=NONE"
  );
  console.log(
    "F10F14F_TEST_STORAGE=OS_TEMP_ONLY"
  );
  console.log(
    "F10F14F_LIVE_RETRIEVAL_INTEGRATION=NONE"
  );
  console.log(
    "F10F14F_DOCUMENT_DOWNLOAD=NONE"
  );
  console.log(
    "F10F14F_PROVIDER_CALL=NONE"
  );
  console.log(
    "F10F14F_PROVIDER_COST=ZERO"
  );
  console.log(
    "F10F14F_DATABASE_MUTATION=NONE"
  );
  console.log(
    "F10F14F_FUNDAMENTAL_MUTATION=NONE"
  );
  console.log(
    "F10F14F_APPROVAL=NONE"
  );
  console.log(
    "F10F14F_PROMOTION=NONE"
  );
  console.log(
    "F10F14F_PUBLICATION=NONE"
  );

  console.log(
    "===== FUND-010F14F PASS ====="
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
