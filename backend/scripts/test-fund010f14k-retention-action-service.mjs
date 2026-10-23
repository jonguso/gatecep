import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

import {
  mkdtemp,
  readFile,
  rm
} from "node:fs/promises";

import {
  executeFundamentalDocumentRetention
} from "../src/modules/fundamental-evidence/fundamentalDocumentRetentionAction.service.js";

console.log(
  "===== FUND-010F14K — CONTROLLED RETENTION ACTION SERVICE TEST ====="
);

const documentBuffer =
  Buffer.from(
    "%PDF-1.7\nFUND-010F14K CONTROLLED ACTION TEST DOCUMENT\n%%EOF\n",
    "utf8"
  );

const actor = {
  id:
    "admin-f14k-test",
  role:
    "ADMIN"
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

const extraction = {
  symbol:
    "KCB",
  fiscalYear:
    2025,
  filingType:
    "ANNUAL_REPORT",
  extractionOnly:
    true,
  persistence:
    "NONE",
  verifiedFiling:
    false,
  verified:
    false,
  authoritative:
    false
};

const retrieval = {
  retrievalMethod:
    "TEST_FIXTURE",
  persistence:
    "NONE",
  verifiedFiling:
    false,
  verified:
    false,
  authoritative:
    false
};

const storageRoot =
  await mkdtemp(
    path.join(
      os.tmpdir(),
      "gatecep-f14k-"
    )
  );

const expectedRelativePath =
  path.join(
    "fundamental-documents",
    "KCB",
    "2025",
    "KCB_2025_ANNUAL_REPORT_CMA.pdf"
  );

async function assertPathMissing(
  root,
  relativePath
) {
  try {
    await readFile(
      path.join(
        root,
        relativePath
      )
    );

    assert.fail(
      "Unexpected retained document."
    );
  } catch (error) {
    if (
      error?.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

try {
  const first =
    await executeFundamentalDocumentRetention({
      actor,
      confirmed:
        true,
      reason:
        "Retain validated KCB annual report evidence.",

      symbol:
        "kcb",
      identity,
      extraction,
      retrieval,
      source:
        "cma",

      documentBuffer,
      storageRoot
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

  assert.deepEqual(
    first.action.actor,
    actor
  );

  assert.equal(
    first.action.confirmed,
    true
  );

  assert.equal(
    first.action.reason,
    "Retain validated KCB annual report evidence."
  );

  console.log(
    "PASS — explicit ADMIN action reached controlled retention."
  );

  const retainedBytes =
    await readFile(
      path.join(
        storageRoot,
        expectedRelativePath
      )
    );

  assert.deepEqual(
    retainedBytes,
    documentBuffer
  );

  console.log(
    "PASS — controlled action preserved exact document bytes."
  );

  const second =
    await executeFundamentalDocumentRetention({
      actor,
      confirmed:
        true,
      reason:
        "Repeat validated KCB retention.",

      symbol:
        "KCB",
      identity,
      extraction,
      retrieval,
      source:
        "CMA",

      documentBuffer,
      storageRoot
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
    "PASS — repeated explicit action remains idempotent."
  );

  /*
   * Unauthorized action must stop before the
   * filesystem-capable retention service.
   */
  const unauthorizedRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "gatecep-f14k-unauthorized-"
      )
    );

  try {
    await assert.rejects(
      executeFundamentalDocumentRetention({
        actor: {
          id:
            "ordinary-user",
          role:
            "USER"
        },
        confirmed:
          true,
        reason:
          "Unauthorized attempt.",

        symbol:
          "KCB",
        identity,
        extraction,
        retrieval,
        source:
          "CMA",

        documentBuffer,
        storageRoot:
          unauthorizedRoot
      }),
      /Administrator authority is required/
    );

    await assertPathMissing(
      unauthorizedRoot,
      expectedRelativePath
    );

    console.log(
      "PASS — non-admin action stopped before filesystem mutation."
    );
  } finally {
    await rm(
      unauthorizedRoot,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }

  /*
   * Missing explicit confirmation must also stop
   * before any filesystem mutation.
   */
  const unconfirmedRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "gatecep-f14k-unconfirmed-"
      )
    );

  try {
    await assert.rejects(
      executeFundamentalDocumentRetention({
        actor,
        confirmed:
          false,
        reason:
          "Unconfirmed attempt.",

        symbol:
          "KCB",
        identity,
        extraction,
        retrieval,
        source:
          "CMA",

        documentBuffer,
        storageRoot:
          unconfirmedRoot
      }),
      /Explicit confirmation is required/
    );

    await assertPathMissing(
      unconfirmedRoot,
      expectedRelativePath
    );

    console.log(
      "PASS — unconfirmed action stopped before filesystem mutation."
    );
  } finally {
    await rm(
      unconfirmedRoot,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }

  /*
   * Missing reason must fail before retention.
   */
  const reasonlessRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "gatecep-f14k-reasonless-"
      )
    );

  try {
    await assert.rejects(
      executeFundamentalDocumentRetention({
        actor,
        confirmed:
          true,
        reason:
          "   ",

        symbol:
          "KCB",
        identity,
        extraction,
        retrieval,
        source:
          "CMA",

        documentBuffer,
        storageRoot:
          reasonlessRoot
      }),
      /retention reason is required/
    );

    await assertPathMissing(
      reasonlessRoot,
      expectedRelativePath
    );

    console.log(
      "PASS — missing reason stopped before filesystem mutation."
    );
  } finally {
    await rm(
      reasonlessRoot,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }

  /*
   * Identity/extraction disagreement remains fail-closed
   * through the composed action service.
   */
  const disagreementRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "gatecep-f14k-disagreement-"
      )
    );

  try {
    await assert.rejects(
      executeFundamentalDocumentRetention({
        actor,
        confirmed:
          true,
        reason:
          "Disagreement test.",

        symbol:
          "KCB",
        identity,
        extraction: {
          ...extraction,
          fiscalYear:
            2024
        },
        retrieval,
        source:
          "CMA",

        documentBuffer,
        storageRoot:
          disagreementRoot
      }),
      /Identity and extraction evidence disagree/
    );

    await assertPathMissing(
      disagreementRoot,
      expectedRelativePath
    );

    console.log(
      "PASS — evidence disagreement stopped before filesystem mutation."
    );
  } finally {
    await rm(
      disagreementRoot,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }

  /*
   * A canonical-path collision with different content
   * must remain fail-closed through the action service.
   */
  await assert.rejects(
    executeFundamentalDocumentRetention({
      actor,
      confirmed:
        true,
      reason:
        "Collision test.",

      symbol:
        "KCB",
      identity,
      extraction,
      retrieval,
      source:
        "CMA",

      documentBuffer:
        Buffer.from(
          "%PDF-1.7\nDIFFERENT F14K CONTENT\n%%EOF\n",
          "utf8"
        ),

      storageRoot
    }),
    /already contains different content/
  );

  const bytesAfterCollision =
    await readFile(
      path.join(
        storageRoot,
        expectedRelativePath
      )
    );

  assert.deepEqual(
    bytesAfterCollision,
    documentBuffer
  );

  console.log(
    "PASS — canonical collision did not replace retained evidence."
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
        actor:
          first.action.actor,
        confirmed:
          first.action.confirmed
      },
      null,
      2
    )
  );

  console.log(
    "F10F14K_PRODUCTION_STORAGE_WRITE=NONE"
  );
  console.log(
    "F10F14K_TEST_STORAGE=OS_TEMP_ONLY"
  );
  console.log(
    "F10F14K_DOCUMENT_DOWNLOAD=NONE"
  );
  console.log(
    "F10F14K_PROVIDER_CALL=NONE"
  );
  console.log(
    "F10F14K_PROVIDER_COST=ZERO"
  );
  console.log(
    "F10F14K_DATABASE_MUTATION=NONE"
  );
  console.log(
    "F10F14K_FUNDAMENTAL_MUTATION=NONE"
  );
  console.log(
    "F10F14K_VERIFICATION=NONE"
  );
  console.log(
    "F10F14K_APPROVAL=NONE"
  );
  console.log(
    "F10F14K_PROMOTION=NONE"
  );
  console.log(
    "F10F14K_PUBLICATION=NONE"
  );

  console.log(
    "===== FUND-010F14K PASS ====="
  );
} finally {
  await rm(
    storageRoot,
    {
      recursive:
        true,
      force:
        true
    }
  );
}
