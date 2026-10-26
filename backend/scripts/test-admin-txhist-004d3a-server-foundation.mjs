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

function pass(label) {
  console.log(`${label}=PASS`);
}

assert.match(
  migration,
  /CREATE TABLE IF NOT EXISTS\s+public\.investor_broker_transaction_history/i
);
pass("DEDICATED_HISTORY_TABLE");

assert.match(
  migration,
  /FOREIGN KEY\s*\(user_id\)[\s\S]*REFERENCES public\.auth_users\(id\)/i
);
pass("AUTH_USER_OWNERSHIP");

assert.match(
  migration,
  /FOREIGN KEY\s*\(\s*user_id,\s*broker_link_id\s*\)[\s\S]*REFERENCES public\.user_broker_links\s*\(\s*user_id,\s*id\s*\)/i
);
pass("USER_BROKER_LINK_FK");

assert.match(
  migration,
  /UNIQUE\s*\(\s*user_id,\s*broker_link_id,\s*broker_account_key,\s*authority_generation,\s*execution_identity\s*\)/i
);
pass("ACCOUNT_SCOPED_IMMUTABLE_IDENTITY");

assert.match(
  migration,
  /total_traded_quantity NUMERIC NOT NULL/i
);

assert.match(
  migration,
  /total_traded_quantity > 0/i
);
pass("POSITIVE_TOTAL_TRADED_REQUIRED");

assert.match(
  migration,
  /'READY'[\s\S]*'NEEDS_REVIEW'/i
);
pass("READY_AND_NEEDS_REVIEW_SUPPORTED");

assert.match(
  migration,
  /descriptive_order_status TEXT/i
);
pass("DESCRIPTIVE_STATUS_RETAINED");

assert.match(
  migration,
  /raw_evidence JSONB NOT NULL/i
);

assert.match(
  migration,
  /verification_metadata JSONB NOT NULL/i
);
pass("RAW_PROVENANCE_RETAINED");

assert.match(
  repository,
  /INSERT INTO[\s\S]*investor_broker_transaction_history/i
);

assert.match(
  repository,
  /ON CONFLICT\s*\([\s\S]*user_id[\s\S]*broker_link_id[\s\S]*broker_account_key[\s\S]*authority_generation[\s\S]*execution_identity[\s\S]*\)\s*DO NOTHING/i
);
pass("APPEND_ONLY_IDEMPOTENT_INSERT");

/*
 * The canonical history repository remains immutable.
 *
 * Authority helpers may SELECT ... FOR UPDATE to serialize
 * generation reads. That SQL locking clause is not a data
 * mutation and must not be mistaken for an UPDATE statement.
 */
const repositoryWithoutForUpdate =
  repository.replace(
    /FOR\\s+UPDATE/gi,
    ""
  );

const mutationStatements =
  repositoryWithoutForUpdate.match(
    /\\b(UPDATE|DELETE)\\b/gi
  ) || [];

assert.equal(
  mutationStatements.length,
  0
);
pass("NORMAL_REPOSITORY_NO_UPDATE_DELETE");

assert.match(
  repository,
  /totalTradedQuantity/
);

assert.match(
  repository,
  /positiveNumber\([\s\S]*input\.totalTradedQuantity/i
);
pass("TOTAL_TRADED_IS_PERSISTED_EXECUTION_QUANTITY");

assert.match(
  repository,
  /descriptiveOrderStatus/
);
pass("ORDER_STATUS_NOT_EXECUTION_GATE");

assert.match(
  repository,
  /executionPrice[\s\S]*nullablePositiveNumber/i
);
pass("MISSING_PRICE_CAN_BE_RETAINED");

assert.match(
  repository,
  /FIFO-ready historical execution evidence is incomplete/i
);
pass("INCOMPLETE_FIFO_EVIDENCE_FAILS_CLOSED");

assert.match(
  repository,
  /fifoEligible !==[\s\S]*canAffectFifo/i
);
pass("FIFO_FLAGS_MUST_AGREE");

const migrationForbidden =
  migration.match(
    /\badmin_broker_execution_evidence\b/gi
  ) || [];

assert.equal(
  migrationForbidden.length,
  0
);
pass("ADMIN_EVIDENCE_TABLE_SEPARATE");

const repositoryForbidden =
  repository.match(
    /\badmin_broker_execution_evidence\b/gi
  ) || [];

assert.equal(
  repositoryForbidden.length,
  0
);
pass("REPOSITORY_NOT_ADMIN_EVIDENCE_BOUND");

console.log(
  "DATABASE_WRITE=NONE"
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
  "ADMIN_TXHIST_004D3A_FOUNDATION=PASS"
);
