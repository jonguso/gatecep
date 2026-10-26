import assert from "node:assert/strict";

import {
  deriveHistoricalExecutionIdentity,
  canonicalHistoricalEvidenceFingerprintRows,
  computeHistoricalEvidenceSha256,
  assertHistoricalEvidenceSha256
} from "../src/modules/transaction-history/investorBrokerTransactionHistoryBootstrap.service.js";

console.log(
  "===== ADMIN-TXHIST-004D4-R7L — SERVER INTEGRITY SYNTHETIC ====="
);

const EXPECTED_REAL_EVIDENCE_SHA256 =
  "2b6198f6e154add84f31ea97d57b58a32b38f84cb90b41dacd9c7c532d53f508";

const EXPECTED_REAL_TRANSPORT_SHA256 =
  "d87ddd9dd7dd7832ad6ffc1e3e5ff8bb788438990f39a63dda8004ad7ce8be7f";

/*
 * Synthetic data only.
 *
 * The real 377 records are deliberately not loaded or sent by
 * this verifier.
 */
const partitions = [
  {
    brokerLinkId:
      "11111111-1111-1111-1111-111111111111",

    executions: [
      {
        brokerAccountKey:
          "AIB|137971",

        executionIdentity:
          "AIB-ORDER-002",

        exchangeOrderNo:
          "AIB-ORDER-002",

        symbol: "KCB",
        side: "SELL",

        totalTradedQuantity: 20,
        executionPrice: 45.5,
        executionDate: "2026-01-03",

        historicalExecutionState:
          "READY",

        executionConfirmed: true,
        fifoEligible: true,
        canAffectFifo: true,

        rawEvidence: {
          ignoredByFingerprint:
            "provenance-only"
        }
      },

      {
        brokerAccountKey:
          "AIB|137971",

        executionIdentity:
          "AIB-ORDER-001",

        exchangeOrderNo:
          "AIB-ORDER-001",

        symbol: "SCOM",
        side: "BUY",

        totalTradedQuantity: 100,
        executionPrice: 30.95,
        executionDate: "2026-01-02",

        historicalExecutionState:
          "READY",

        executionConfirmed: true,
        fifoEligible: true,
        canAffectFifo: true
      }
    ]
  },

  {
    brokerLinkId:
      "22222222-2222-2222-2222-222222222222",

    executions: [
      {
        brokerAccountKey:
          "ABC|23032",

        executionIdentity:
          "ABC-ORDER-001",

        exchangeOrderNo:
          "ABC-ORDER-001",

        symbol: "EABL",
        side: "BUY",

        totalTradedQuantity: 10,
        executionPrice: 570,
        executionDate: "2026-01-04",

        historicalExecutionState:
          "READY",

        executionConfirmed: true,
        fifoEligible: true,
        canAffectFifo: true
      }
    ]
  }
];

/*
 * Identity must be derived from Exchange Order No.
 */
assert.equal(
  deriveHistoricalExecutionIdentity({
    exchangeOrderNo:
      " EXCHANGE-123 ",
    executionIdentity:
      "EXCHANGE-123"
  }),
  "EXCHANGE-123"
);

console.log(
  "IDENTITY_DERIVED_FROM_EXCHANGE_ORDER=PASS"
);

/*
 * Client may omit the duplicate transport field.
 */
assert.equal(
  deriveHistoricalExecutionIdentity({
    exchangeOrderNo:
      "EXCHANGE-456"
  }),
  "EXCHANGE-456"
);

console.log(
  "CLIENT_EXECUTION_IDENTITY_OPTIONAL=PASS"
);

/*
 * Client cannot redefine immutable identity.
 */
let mismatchRejected = false;

try {
  deriveHistoricalExecutionIdentity({
    exchangeOrderNo:
      "EXCHANGE-789",
    executionIdentity:
      "CLIENT-INVENTED-ID"
  });
} catch (error) {
  mismatchRejected =
    error?.code ===
    "HISTORICAL_EXECUTION_IDENTITY_MISMATCH";
}

assert.equal(
  mismatchRejected,
  true
);

console.log(
  "CLIENT_IDENTITY_DIVERGENCE_REJECTED=PASS"
);

/*
 * Fingerprint must be deterministic regardless of execution
 * array order.
 */
const firstHash =
  computeHistoricalEvidenceSha256(
    partitions
  );

const reordered = [
  partitions[1],
  {
    ...partitions[0],
    executions: [
      ...partitions[0].executions
    ].reverse()
  }
];

const secondHash =
  computeHistoricalEvidenceSha256(
    reordered
  );

assert.equal(
  firstHash,
  secondHash
);

console.log(
  "SERVER_EVIDENCE_FINGERPRINT_ORDER_INDEPENDENT=PASS"
);

/*
 * Provenance must not redefine canonical evidence integrity.
 */
const provenanceChanged =
  structuredClone(partitions);

provenanceChanged[0]
  .executions[0]
  .rawEvidence = {
    completely:
      "different provenance"
  };

assert.equal(
  computeHistoricalEvidenceSha256(
    provenanceChanged
  ),
  firstHash
);

console.log(
  "PROVENANCE_EXCLUDED_FROM_EVIDENCE_IDENTITY=PASS"
);

/*
 * A canonical evidence change must change the fingerprint.
 */
const priceChanged =
  structuredClone(partitions);

priceChanged[0]
  .executions[0]
  .executionPrice = 46;

assert.notEqual(
  computeHistoricalEvidenceSha256(
    priceChanged
  ),
  firstHash
);

console.log(
  "CANONICAL_EVIDENCE_CHANGE_DETECTED=PASS"
);

/*
 * Server assertion accepts exact expected fingerprint.
 */
assert.equal(
  assertHistoricalEvidenceSha256({
    partitions,
    expectedEvidenceSha256:
      firstHash
  }),
  firstHash
);

console.log(
  "EXPECTED_FINGERPRINT_ACCEPTED=PASS"
);

/*
 * Server assertion fails closed on mismatch.
 */
let fingerprintMismatchRejected =
  false;

try {
  assertHistoricalEvidenceSha256({
    partitions,
    expectedEvidenceSha256:
      "0".repeat(64)
  });
} catch (error) {
  fingerprintMismatchRejected =
    error?.code ===
    "HISTORICAL_EVIDENCE_FINGERPRINT_MISMATCH";
}

assert.equal(
  fingerprintMismatchRejected,
  true
);

console.log(
  "FINGERPRINT_MISMATCH_FAIL_CLOSED=PASS"
);

/*
 * Missing/invalid expected fingerprint must also fail closed.
 */
let missingFingerprintRejected =
  false;

try {
  assertHistoricalEvidenceSha256({
    partitions
  });
} catch (error) {
  missingFingerprintRejected =
    error?.code ===
    "HISTORICAL_EVIDENCE_FINGERPRINT_REQUIRED";
}

assert.equal(
  missingFingerprintRejected,
  true
);

console.log(
  "EXPECTED_FINGERPRINT_REQUIRED=PASS"
);

/*
 * Show exact canonical synthetic rows for auditability.
 */
const rows =
  canonicalHistoricalEvidenceFingerprintRows(
    partitions
  );

assert.equal(
  rows.length,
  3
);

console.log(
  "SYNTHETIC_CANONICAL_ROW_COUNT=" +
  rows.length
);

console.log(
  "SYNTHETIC_EVIDENCE_SHA256=" +
  firstHash
);

/*
 * Preserve the two real browser checkpoints as constants in
 * this verifier, but do NOT claim that synthetic data reproduces
 * either one.
 */
console.log(
  "REAL_377_EXPECTED_EVIDENCE_SHA256=" +
  EXPECTED_REAL_EVIDENCE_SHA256
);

console.log(
  "REAL_377_EXPECTED_TRANSPORT_SHA256=" +
  EXPECTED_REAL_TRANSPORT_SHA256
);

console.log(
  "REAL_377_LOADED=NO"
);

console.log(
  "REAL_BOOTSTRAP_REQUEST=NONE"
);

console.log(
  "DATABASE_WRITE=NONE_SYNTHETIC_ONLY"
);

console.log(
  "ADMIN_TXHIST_004D4_R7L_SERVER_INTEGRITY=PASS"
);
