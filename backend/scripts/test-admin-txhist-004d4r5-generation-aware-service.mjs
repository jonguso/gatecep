import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const service =
  readFileSync(
    new URL(
      "../src/modules/transaction-history/" +
      "investorBrokerTransactionHistory.service.js",
      import.meta.url
    ),
    "utf8"
  );

const repository =
  readFileSync(
    new URL(
      "../src/modules/transaction-history/" +
      "investorBrokerTransactionHistory.repository.js",
      import.meta.url
    ),
    "utf8"
  );

function pass(label) {
  console.log(`${label}=PASS`);
}

assert.match(
  service,
  /const\s+observedGeneration\s*=\s*requirePositiveGeneration/
);
pass("OBSERVED_GENERATION_REQUIRED");

assert.match(
  service,
  /deps\.getOrCreateAuthority\s*\|\|\s*getOrCreateInvestorBrokerTransactionHistoryAuthority/
);
pass("AUTHORITY_DEPENDENCY_BOUND");

assert.match(
  service,
  /await\s+getOrCreateAuthority\s*\(/
);
pass("AUTHORITY_LOCK_USED_BY_APPEND");

assert.match(
  service,
  /const\s+currentGeneration\s*=\s*Number/
);
pass("CURRENT_GENERATION_READ");

assert.match(
  service,
  /observedGeneration\s*!==\s*currentGeneration/
);
pass("STALE_GENERATION_COMPARISON");

assert.match(
  service,
  /STALE_TRANSACTION_HISTORY_GENERATION/
);
pass("STALE_GENERATION_EXPLICIT_ERROR");

assert.match(
  service,
  /\.\.\.execution,[\s\S]*?authorityGeneration:\s*currentGeneration/
);
pass("APPEND_TAGGED_WITH_CURRENT_GENERATION");

assert.match(
  service,
  /currentGeneration,[\s\S]*?receivedCount/
);
pass("APPEND_RESPONSE_RETURNS_GENERATION");

assert.match(
  repository,
  /FOR\s+UPDATE/i
);
pass("AUTHORITY_TRANSACTION_LOCK");

assert.match(
  repository,
  /ON\s+CONFLICT\s*\([\s\S]*?user_id[\s\S]*?broker_link_id[\s\S]*?broker_account_key[\s\S]*?authority_generation[\s\S]*?execution_identity[\s\S]*?\)\s*DO\s+NOTHING/i
);
pass("GENERATION_SCOPED_IDEMPOTENCY");

assert.doesNotMatch(
  service,
  /UPDATE\s+public\.investor_broker_transaction_history_authority/i
);
pass("NORMAL_SERVICE_CANNOT_ADVANCE_GENERATION");

assert.doesNotMatch(
  service,
  /DELETE\s+FROM\s+public\.investor_broker_transaction_history/i
);
pass("NORMAL_SERVICE_CANNOT_RESET_HISTORY");

console.log(
  "READ_RESPONSE_GENERATION=DEFERRED_NEXT_GATE"
);

console.log(
  "MOBILE_SYNC_CONNECTION=NONE"
);

console.log(
  "MIGRATION_EXECUTION=NONE"
);

console.log(
  "EXISTING_377_HISTORY_MIGRATION=NONE"
);

console.log(
  "ADMIN_RESET_ENABLEMENT=BLOCKED"
);

console.log(
  "ADMIN_TXHIST_004D4_R5_SERVICE=PASS"
);
