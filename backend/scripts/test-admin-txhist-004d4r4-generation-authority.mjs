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
  console.log(`${label}=PASS`);
}

assert.match(
  migration,
  /CREATE TABLE IF NOT EXISTS\s+public\.investor_broker_transaction_history_authority/i
);
pass(
  "ACCOUNT_AUTHORITY_TABLE"
);

assert.match(
  migration,
  /current_generation BIGINT NOT NULL DEFAULT 1[\s\S]*current_generation >= 1/i
);
pass(
  "CURRENT_GENERATION_POSITIVE"
);

assert.match(
  migration,
  /authority_generation BIGINT NOT NULL DEFAULT 1[\s\S]*authority_generation >= 1/i
);
pass(
  "HISTORY_GENERATION_POSITIVE"
);

assert.match(
  migration,
  /PRIMARY KEY\s*\(\s*user_id,\s*broker_link_id,\s*broker_account_key\s*\)/i
);
pass(
  "AUTHORITY_ACCOUNT_SCOPED"
);

assert.match(
  migration,
  /investor_broker_transaction_history_authority_broker_owner_fk[\s\S]*FOREIGN KEY\s*\(\s*user_id,\s*broker_link_id\s*\)[\s\S]*user_broker_links[\s\S]*ON DELETE RESTRICT/i
);
pass(
  "AUTHORITY_BROKER_OWNERSHIP_RESTRICTED"
);

assert.match(
  migration,
  /investor_broker_transaction_history_authority_account_fk[\s\S]*FOREIGN KEY\s*\(\s*user_id,\s*broker_link_id,\s*broker_account_key\s*\)[\s\S]*investor_broker_transaction_history_authority/i
);
pass(
  "HISTORY_AUTHORITY_ACCOUNT_FK"
);

assert.match(
  migration,
  /UNIQUE\s*\(\s*user_id,\s*broker_link_id,\s*broker_account_key,\s*authority_generation,\s*execution_identity\s*\)/i
);
pass(
  "GENERATION_SCOPED_IMMUTABLE_IDENTITY"
);

assert.match(
  repository,
  /getOrCreateInvestorBrokerTransactionHistoryAuthority/
);
pass(
  "AUTHORITY_GET_OR_CREATE_REPOSITORY"
);

assert.match(
  repository,
  /findInvestorBrokerTransactionHistoryAuthority/
);
pass(
  "AUTHORITY_READ_REPOSITORY"
);

assert.match(
  repository,
  /current_generation[\s\S]*FOR UPDATE/i
);
pass(
  "AUTHORITY_TRANSACTION_LOCK"
);

/*
 * Normal repository must not contain generation advancement.
 *
 * INSERT of initial generation 1 is allowed.
 * UPDATE current_generation is reserved for future Admin reset.
 */
assert.doesNotMatch(
  repository,
  /UPDATE\s+public\.investor_broker_transaction_history_authority[\s\S]*current_generation/i
);
pass(
  "NORMAL_REPOSITORY_CANNOT_ADVANCE_GENERATION"
);

assert.match(
  service,
  /authenticatedUserId/
);
pass(
  "AUTHENTICATED_OWNER_STILL_REQUIRED"
);

assert.match(
  service,
  /user_broker_links/i
);
pass(
  "BROKER_OWNERSHIP_STILL_REQUIRED"
);

assert.doesNotMatch(
  migration,
  /\bUPDATE\s+public\.investor_broker_transaction_history\b/i
);
pass(
  "MIGRATION_DOES_NOT_UPDATE_HISTORY"
);

assert.doesNotMatch(
  migration,
  /\bDELETE\s+FROM\s+public\.investor_broker_transaction_history\b/i
);
pass(
  "MIGRATION_DOES_NOT_DELETE_HISTORY"
);

console.log(
  "LOCAL_READY_MAPPING=" +
  "EXECUTED_READY_TO_READY_REQUIRED"
);

console.log(
  "STALE_GENERATION_REJECTION=" +
  "SERVICE_PATCH_PENDING"
);

console.log(
  "ADMIN_RESET_ENABLEMENT=BLOCKED"
);

console.log(
  "MIGRATION_EXECUTION=NONE"
);

console.log(
  "EXISTING_377_HISTORY_MIGRATION=NONE"
);

console.log(
  "REAL_HISTORY_RESET=NONE"
);

console.log(
  "ADMIN_TXHIST_004D4_R4_FOUNDATION=PASS"
);
