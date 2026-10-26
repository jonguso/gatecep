import assert from "node:assert/strict";
import fs from "node:fs";

console.log(
  "===== ADMIN-TXHIST-004D4-R7L-R5 — NORMALIZED FINGERPRINT VERIFICATION ====="
);

const servicePath =
  new URL(
    "../src/modules/transaction-history/investorBrokerTransactionHistoryBootstrap.service.js",
    import.meta.url
  );

const source =
  fs.readFileSync(
    servicePath,
    "utf8"
  );

/*
 * This gate verifies the production trust-boundary ordering.
 *
 * The expected hash format may be checked before DB access.
 * Evidence equality may NOT be checked until the server has:
 *
 * 1. resolved owned broker links,
 * 2. derived canonical brokerAccountKey,
 * 3. normalized every execution,
 * 4. assembled the complete prepared set.
 *
 * Equality must still occur before authority/history mutation.
 */

assert.match(
  source,
  /requireExpectedHistoricalEvidenceSha256/
);

console.log(
  "EXPECTED_SHA_FORMAT_VALIDATOR=PASS"
);

assert.match(
  source,
  /const\s+expectedEvidenceSha256\s*=\s*requireExpectedHistoricalEvidenceSha256/
);

console.log(
  "EXPECTED_SHA_FORMAT_ONLY_PREVALIDATION=PASS"
);

assert.doesNotMatch(
  source,
  /assertHistoricalEvidenceSha256\(\{\s*partitions\s*,\s*expectedEvidenceSha256\s*:\s*input\.expectedEvidenceSha256/
);

console.log(
  "RAW_CLIENT_PARTITION_EQUALITY_REMOVED=PASS"
);

assert.match(
  source,
  /prepared\.map\(\s*partition\s*=>\s*\(\{\s*executions\s*:\s*partition\.normalized/
);

console.log(
  "FINGERPRINT_INPUT_USES_PREPARED_NORMALIZED_ROWS=PASS"
);

const preparedIndex =
  source.indexOf(
    "const prepared ="
  );

const fingerprintIndex =
  source.indexOf(
    "const evidenceSha256 =",
    preparedIndex
  );

const resultsIndex =
  source.indexOf(
    "const results = []",
    preparedIndex
  );

assert.ok(
  preparedIndex >= 0,
  "prepared set must exist"
);

assert.ok(
  fingerprintIndex >
    preparedIndex,
  "fingerprint equality must occur after prepared normalization"
);

assert.ok(
  resultsIndex >
    fingerprintIndex,
  "authority/history processing must occur after fingerprint equality"
);

console.log(
  "NORMALIZE_THEN_FINGERPRINT_THEN_MUTATE_ORDER=PASS"
);

/*
 * Confirm normalization itself remains server authoritative.
 */

assert.match(
  source,
  /normalizeExecution/
);

assert.match(
  source,
  /deriveHistoricalExecutionIdentity/
);

console.log(
  "SERVER_EXECUTION_NORMALIZATION_PRESENT=PASS"
);

console.log(
  "SERVER_DERIVED_EXECUTION_IDENTITY_PRESENT=PASS"
);

/*
 * No live request and no real bootstrap in this verifier.
 */

console.log(
  "HTTP_REQUEST=NONE"
);

console.log(
  "REAL_377_PAYLOAD_LOADED=NO"
);

console.log(
  "REAL_377_BOOTSTRAP=NONE"
);

console.log(
  "DATABASE_WRITE=NONE_STATIC_VERIFIER"
);

console.log(
  "ADMIN_TXHIST_004D4_R7L_R5_STATIC=PASS"
);
