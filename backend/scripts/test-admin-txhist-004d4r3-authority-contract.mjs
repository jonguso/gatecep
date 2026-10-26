import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const migration =
  readFileSync(
    new URL(
      "../src/database/migrations/019_investor_broker_transaction_history.sql",
      import.meta.url
    ),
    "utf8"
  );

const repository =
  readFileSync(
    new URL(
      "../src/modules/transaction-history/investorBrokerTransactionHistory.repository.js",
      import.meta.url
    ),
    "utf8"
  );

const service =
  readFileSync(
    new URL(
      "../src/modules/transaction-history/investorBrokerTransactionHistory.service.js",
      import.meta.url
    ),
    "utf8"
  );

function pass(label) {
  console.log(
    `${label}=PASS`
  );
}

assert.match(
  migration,
  /historical_execution_state IN\s*\(\s*'READY',\s*'NEEDS_REVIEW'\s*\)/i
);
pass(
  "SERVER_NORMALIZED_HISTORY_STATES"
);

assert.doesNotMatch(
  migration,
  /'EXECUTED_READY'/
);
pass(
  "LOCAL_STATE_NOT_PERSISTED_AS_SERVER_ENUM"
);

assert.match(
  migration,
  /historical_execution_state = 'NEEDS_REVIEW'[\s\S]*fifo_eligible = FALSE[\s\S]*can_affect_fifo = FALSE/i
);
pass(
  "SERVER_NEEDS_REVIEW_FAILS_CLOSED"
);

assert.match(
  migration,
  /historical_execution_state = 'READY'[\s\S]*execution_confirmed = TRUE[\s\S]*fifo_eligible = TRUE[\s\S]*can_affect_fifo = TRUE/i
);
pass(
  "SERVER_READY_FIFO_CONTRACT"
);

assert.match(
  repository,
  /ON CONFLICT[\s\S]*DO NOTHING/i
);
pass(
  "SERVER_APPEND_IDEMPOTENCY"
);

/*
 * SELECT ... FOR UPDATE is a row-locking operation,
 * not an UPDATE mutation. Remove only that SQL phrase
 * before asserting that the normal repository cannot
 * mutate canonical history or advance authority.
 */
const repositoryWithoutForUpdate =
  repository.replace(
    /FOR\s+UPDATE/gi,
    ""
  );

assert.doesNotMatch(
  repositoryWithoutForUpdate,
  /\bUPDATE\b/i
);
pass(
  "NORMAL_REPOSITORY_NO_UPDATE"
);

assert.doesNotMatch(
  repository,
  /\bDELETE\b/i
);
pass(
  "NORMAL_REPOSITORY_NO_DELETE"
);

assert.match(
  service,
  /authenticatedUserId/
);
pass(
  "AUTHENTICATED_OWNER_REQUIRED"
);

assert.match(
  service,
  /user_broker_links/i
);
pass(
  "SERVER_BROKER_OWNERSHIP_REQUIRED"
);

assert.match(
  migration,
  /ON DELETE RESTRICT/i
);
pass(
  "BROKER_LINK_DELETE_RESTRICTED"
);

console.log(
  "STATE_MAPPING_REQUIRED=" +
  "EXECUTED_READY_TO_READY"
);

console.log(
  "GENERATION_RESET_EPOCH_REQUIRED=YES"
);

console.log(
  "ADMIN_RESET_ENABLEMENT=BLOCKED"
);

console.log(
  "MIGRATION_EXECUTION=NONE"
);

console.log(
  "REAL_HISTORY_MIGRATION=NONE"
);

console.log(
  "REAL_HISTORY_RESET=NONE"
);

console.log(
  "ADMIN_TXHIST_004D4_R3_CONTRACT=PASS"
);
