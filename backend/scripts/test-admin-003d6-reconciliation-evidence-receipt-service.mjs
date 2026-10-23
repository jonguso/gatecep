import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  createVerifiedAdminReconciliationEvidenceReceipt,
  lockAdminReconciliationEvidenceReceipt,
  sha256EvidenceBuffer
} from "../src/modules/admin/adminReconciliationEvidenceReceipt.service.js";

let assertions = 0;

function check(
  condition,
  message
) {
  assert.ok(
    condition,
    message
  );

  assertions += 1;

  console.log(
    `PASS ${assertions} — ${message}`
  );
}

async function expectCode(
  fn,
  code,
  message
) {
  let thrown = null;

  try {
    await fn();
  } catch (error) {
    thrown = error;
  }

  check(
    thrown?.code === code,
    message
  );
}

const fileBuffer =
  Buffer.from(
    "verified broker evidence"
  );

const expectedDigest =
  crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");

check(
  sha256EvidenceBuffer(
    fileBuffer
  ) === expectedDigest,
  "receipt SHA-256 is calculated from the server evidence buffer"
);

const createdQueries = [];

const createQueryable = {
  async query(sql, values) {
    createdQueries.push({
      sql,
      values
    });

    return {
      rows: [
        {
          id: "receipt-1",
          actorUserId:
            "admin-1",
          targetUserId:
            "user-1",
          brokerLinkId:
            "broker-1",
          brokerAccountKey:
            "AIB-AXYS|137971",
          reportType:
            "cash",
          fileSha256:
            values[5],
          extractionPayload:
            JSON.parse(values[6]),
          identityVerification:
            JSON.parse(values[7]),
          createdAt:
            new Date(
              "2026-10-18T12:00:00Z"
            ),
          expiresAt:
            values[8],
          consumedAt: null
        }
      ]
    };
  }
};

const extraction = {
  reportType: "cash",
  rows: [
    {
      Date:
        "16-Oct-2026",
      Balance:
        "55,818.80"
    }
  ]
};

const verified = {
  identityVerified: true
};

const created =
  await createVerifiedAdminReconciliationEvidenceReceipt(
    {
      actorUserId:
        "admin-1",
      targetUserId:
        "user-1",
      brokerLinkId:
        "broker-1",
      brokerAccountKey:
        "AIB-AXYS|137971",
      reportType:
        "cash",
      fileBuffer,
      extraction,
      identityVerification:
        verified,
      now:
        new Date(
          "2026-10-18T12:00:00Z"
        )
    },
    createQueryable
  );

check(
  createdQueries.length === 1,
  "verified evidence creates exactly one receipt insert"
);

check(
  created.fileSha256 ===
    expectedDigest,
  "persisted receipt uses server-derived file digest"
);

check(
  new Date(
    created.expiresAt
  ).getTime() ===
    new Date(
      "2026-10-18T12:15:00Z"
    ).getTime(),
  "receipt expires exactly 15 minutes after creation"
);

check(
  createdQueries[0]
    .sql
    .includes(
      "admin_reconciliation_evidence_receipts"
    ),
  "receipt insert targets dedicated receipt table"
);

await expectCode(
  () =>
    createVerifiedAdminReconciliationEvidenceReceipt(
      {
        actorUserId:
          "admin-1",
        targetUserId:
          "user-1",
        brokerLinkId:
          "broker-1",
        brokerAccountKey:
          "AIB-AXYS|137971",
        reportType:
          "cash",
        fileBuffer,
        extraction,
        identityVerification: {
          identityVerified:
            false
        }
      },
      createQueryable
    ),
  "RECONCILIATION_RECEIPT_IDENTITY_UNVERIFIED",
  "unverified evidence cannot create a receipt"
);

await expectCode(
  () =>
    createVerifiedAdminReconciliationEvidenceReceipt(
      {
        actorUserId:
          "same-user",
        targetUserId:
          "same-user",
        brokerLinkId:
          "broker-1",
        brokerAccountKey:
          "AIB-AXYS|137971",
        reportType:
          "cash",
        fileBuffer,
        extraction,
        identityVerification:
          verified
      },
      createQueryable
    ),
  "RECONCILIATION_RECEIPT_ACTOR_TARGET_CONFLICT",
  "Admin actor cannot equal reconciliation target"
);

await expectCode(
  () =>
    createVerifiedAdminReconciliationEvidenceReceipt(
      {
        actorUserId:
          "admin-1",
        targetUserId:
          "user-1",
        brokerLinkId:
          "broker-1",
        brokerAccountKey:
          "AIB-AXYS|137971",
        reportType:
          "valuation",
        fileBuffer,
        extraction,
        identityVerification:
          verified
      },
      createQueryable
    ),
  "RECONCILIATION_RECEIPT_REPORT_TYPE_MISMATCH",
  "receipt report type must match server extraction"
);

const validReceipt = {
  id: "receipt-1",
  actorUserId:
    "admin-1",
  targetUserId:
    "user-1",
  brokerLinkId:
    "broker-1",
  brokerAccountKey:
    "AIB-AXYS|137971",
  reportType:
    "cash",
  fileSha256:
    expectedDigest,
  extractionPayload:
    extraction,
  identityVerification:
    verified,
  createdAt:
    new Date(
      "2026-10-18T12:00:00Z"
    ),
  expiresAt:
    new Date(
      "2026-10-18T12:15:00Z"
    ),
  consumedAt:
    null
};

function lockQueryable(
  receipt
) {
  return {
    async query(sql) {
      check(
        /FOR\s+UPDATE/i.test(
          sql
        ),
        "receipt lookup obtains row lock"
      );

      return {
        rows:
          receipt
            ? [receipt]
            : []
      };
    }
  };
}

const locked =
  await lockAdminReconciliationEvidenceReceipt(
    {
      receiptId:
        "receipt-1",
      actorUserId:
        "admin-1",
      targetUserId:
        "user-1",
      brokerLinkId:
        "broker-1",
      brokerAccountKey:
        "AIB-AXYS|137971",
      expectedReportType:
        "cash",
      now:
        new Date(
          "2026-10-18T12:10:00Z"
        )
    },
    lockQueryable(
      validReceipt
    )
  );

check(
  locked.id ===
    "receipt-1",
  "valid unexpired matching receipt can be locked"
);

await expectCode(
  () =>
    lockAdminReconciliationEvidenceReceipt(
      {
        receiptId:
          "receipt-1",
        actorUserId:
          "other-admin",
        targetUserId:
          "user-1",
        brokerLinkId:
          "broker-1",
        brokerAccountKey:
          "AIB-AXYS|137971",
        expectedReportType:
          "cash",
        now:
          new Date(
            "2026-10-18T12:10:00Z"
          )
      },
      {
        async query() {
          return {
            rows: [
              validReceipt
            ]
          };
        }
      }
    ),
  "RECONCILIATION_RECEIPT_CONTEXT_MISMATCH",
  "receipt cannot cross Admin actor context"
);

await expectCode(
  () =>
    lockAdminReconciliationEvidenceReceipt(
      {
        receiptId:
          "receipt-1",
        actorUserId:
          "admin-1",
        targetUserId:
          "user-1",
        brokerLinkId:
          "broker-1",
        brokerAccountKey:
          "AIB-AXYS|137971",
        expectedReportType:
          "cash",
        now:
          new Date(
            "2026-10-18T12:15:00Z"
          )
      },
      {
        async query() {
          return {
            rows: [
              validReceipt
            ]
          };
        }
      }
    ),
  "RECONCILIATION_RECEIPT_EXPIRED",
  "receipt is expired at its expiration boundary"
);

await expectCode(
  () =>
    lockAdminReconciliationEvidenceReceipt(
      {
        receiptId:
          "receipt-1",
        actorUserId:
          "admin-1",
        targetUserId:
          "user-1",
        brokerLinkId:
          "broker-1",
        brokerAccountKey:
          "AIB-AXYS|137971",
        expectedReportType:
          "cash",
        now:
          new Date(
            "2026-10-18T12:10:00Z"
          )
      },
      {
        async query() {
          return {
            rows: [
              {
                ...validReceipt,
                consumedAt:
                  new Date(
                    "2026-10-18T12:05:00Z"
                  )
              }
            ]
          };
        }
      }
    ),
  "RECONCILIATION_RECEIPT_ALREADY_CONSUMED",
  "consumed receipt cannot be reused"
);

await expectCode(
  () =>
    lockAdminReconciliationEvidenceReceipt(
      {
        receiptId:
          "missing",
        actorUserId:
          "admin-1",
        targetUserId:
          "user-1",
        brokerLinkId:
          "broker-1",
        brokerAccountKey:
          "AIB-AXYS|137971",
        expectedReportType:
          "cash"
      },
      {
        async query() {
          return {
            rows: []
          };
        }
      }
    ),
  "RECONCILIATION_RECEIPT_NOT_FOUND",
  "missing receipt fails closed"
);

console.log(
  `R8J4F2_ASSERTIONS=${assertions}`
);

console.log(
  "ADMIN_003D6_R8J4F2=COMPLETE"
);
