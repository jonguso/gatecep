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
  /ALTER TABLE\s+public\.user_broker_links[\s\S]*ADD CONSTRAINT\s+user_broker_links_user_id_id_unique[\s\S]*UNIQUE\s*\(\s*user_id,\s*id\s*\)/i
);
pass(
  "BROKER_LINK_COMPOSITE_UNIQUE_KEY"
);

assert.match(
  migration,
  /CONSTRAINT\s+investor_broker_transaction_history_broker_owner_fk[\s\S]*FOREIGN KEY\s*\(\s*user_id,\s*broker_link_id\s*\)[\s\S]*REFERENCES public\.user_broker_links\s*\(\s*user_id,\s*id\s*\)/i
);
pass(
  "DATABASE_COMPOSITE_OWNERSHIP_FK"
);

assert.doesNotMatch(
  migration,
  /CONSTRAINT\s+investor_broker_transaction_history_broker_link_fk[\s\S]*FOREIGN KEY\s*\(\s*broker_link_id\s*\)/i
);
pass(
  "SINGLE_COLUMN_BROKER_FK_REPLACED"
);

assert.match(
  migration,
  /FOREIGN KEY\s*\(user_id\)[\s\S]*REFERENCES public\.auth_users\(id\)/i
);
pass(
  "AUTH_USER_FK_PRESERVED"
);

assert.match(
  migration,
  /UNIQUE\s*\(\s*user_id,\s*broker_link_id,\s*broker_account_key,\s*authority_generation,\s*execution_identity\s*\)/i
);
pass(
  "HISTORY_IMMUTABLE_IDENTITY_PRESERVED"
);

assert.match(
  migration,
  /total_traded_quantity > 0/i
);
pass(
  "TOTAL_TRADED_RULE_PRESERVED"
);

assert.match(
  migration,
  /historical_execution_state IN\s*\(\s*'READY',\s*'NEEDS_REVIEW'\s*\)/i
);
pass(
  "HISTORICAL_STATES_PRESERVED"
);

assert.match(
  service,
  /WHERE[\s\S]*id = \$1[\s\S]*AND user_id = \$2/i
);
pass(
  "SERVICE_OWNERSHIP_CHECK_PRESERVED"
);

assert.match(
  service,
  /Client-supplied user identity is not accepted/i
);
pass(
  "CLIENT_USER_ID_REJECTION_PRESERVED"
);

assert.match(
  service,
  /brokerLink\.brokerAccountKey/
);
pass(
  "SERVER_ACCOUNT_KEY_PRESERVED"
);

const dataMutations =
  migration.match(
    /^\s*(INSERT|UPDATE|DELETE)\s+/gim
  ) || [];

assert.equal(
  dataMutations.length,
  0
);
pass(
  "MIGRATION_HAS_NO_HISTORY_DATA_MUTATION"
);

console.log(
  "MIGRATION_EXECUTION=NONE"
);
console.log(
  "DATABASE_WRITE=NONE"
);
console.log(
  "REAL_HISTORY_MIGRATION=NONE"
);
console.log(
  "REAL_HISTORY_RESET=NONE"
);
console.log(
  "ADMIN_TXHIST_004D3C_OWNERSHIP=PASS"
);
