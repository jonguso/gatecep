import fs from "node:fs";
import assert from "node:assert/strict";

const file =
  "mobile/app/transactions-upload.js";

const source =
  fs.readFileSync(
    file,
    "utf8"
  );

const marker =
  "POSTPROD-SYNC-002F2D6D";

const markerIndex =
  source.indexOf(marker);

assert.ok(
  markerIndex >= 0,
  "review handshake marker must exist"
);

const reviewStart =
  source.lastIndexOf(
    "resolveAndLoadCanonicalBrokerTransactionHistory",
    markerIndex
  );

const reviewEnd =
  source.indexOf(
    "setRawEvidenceRows(rows)",
    markerIndex
  );

assert.ok(
  reviewStart >= 0,
  "review canonical read must exist"
);

assert.ok(
  reviewEnd > reviewStart,
  "review section boundary must exist"
);

const review =
  source.slice(
    reviewStart,
    reviewEnd
  );

function position(
  needle,
  label
) {
  const value =
    review.indexOf(needle);

  assert.ok(
    value >= 0,
    label + " must exist"
  );

  return value;
}

const firstRead =
  position(
    "resolveAndLoadCanonicalBrokerTransactionHistory",
    "initial canonical read"
  );

const absentCheck =
  position(
    '"AUTHORITY_NOT_ESTABLISHED"',
    "absent authority check"
  );

const initialize =
  position(
    "await initializeCanonicalBrokerTransactionHistoryAuthority({",
    "authority initializer"
  );

const secondRead =
  review.indexOf(
    "resolveAndLoadCanonicalBrokerTransactionHistory",
    firstRead + 1
  );

assert.ok(
  secondRead >= 0,
  "canonical authority must be re-read after initialization"
);

const secondClassification =
  review.indexOf(
    "classifyCanonicalHistoryAuthority(",
    initialize
  );

assert.ok(
  secondClassification >= 0,
  "re-read canonical authority must be reclassified"
);

const emptyCheck =
  review.indexOf(
    '"AUTHORITY_ESTABLISHED_EMPTY"',
    secondClassification
  );

assert.ok(
  emptyCheck >= 0,
  "established-empty state must be handled"
);

const localReset =
  review.indexOf(
    "resetBrokerTransactionHistoryEvidence({",
    emptyCheck
  );

assert.ok(
  localReset >= 0,
  "stale selected-account local evidence must reset only after canonical empty authority"
);

const duplicateReview =
  review.indexOf(
    "reviewBrokerTransactionUpload({",
    localReset
  );

assert.ok(
  duplicateReview >= 0,
  "broker upload review must occur after canonical authority handling"
);

assert.ok(
  firstRead <
    absentCheck &&
  absentCheck <
    initialize &&
  initialize <
    secondRead &&
  secondRead <
    secondClassification &&
  secondClassification <
    emptyCheck &&
  emptyCheck <
    localReset &&
  localReset <
    duplicateReview,
  "first-use review sequence is incorrect"
);

console.log(
  "CASE_1_FIRST_USE_INITIALIZES_BEFORE_REVIEW=PASS"
);

assert.equal(
  review.includes(
    "appendCanonicalBrokerTransactionHistory("
  ),
  false,
  "file selection/review must not append canonical history"
);

console.log(
  "CASE_2_REVIEW_DOES_NOT_APPEND_HISTORY=PASS"
);

assert.equal(
  review.includes(
    "saveBrokerTransactionHistoryEvidence("
  ),
  false,
  "file selection/review must not persist verified history"
);

console.log(
  "CASE_3_REVIEW_DOES_NOT_SAVE_VERIFIED_HISTORY=PASS"
);

assert.equal(
  review.includes(
    "Canonical Transaction History authority is not established for this broker account."
  ),
  false,
  "old first-use fail-closed blocker must remain removed"
);

console.log(
  "CASE_4_OLD_FIRST_USE_BLOCKER_REMOVED=PASS"
);

assert.ok(
  review.includes(
    "Canonical Transaction History authority is not established after first-use initialization."
  ),
  "post-initialization fail-closed guard must remain"
);

console.log(
  "CASE_5_POST_INITIALIZATION_FAIL_CLOSED=PASS"
);

const initializerCalls =
  (
    source.match(
      /await initializeCanonicalBrokerTransactionHistoryAuthority\(\{/g
    ) || []
  ).length;

assert.equal(
  initializerCalls,
  2,
  "expected review-stage and append-stage initializer guards"
);

console.log(
  "CASE_6_REVIEW_AND_APPEND_GUARDS_PRESENT=PASS"
);

console.log(
  "POSTPROD_SYNC_002F2D6E_BEHAVIOR=PASS"
);
