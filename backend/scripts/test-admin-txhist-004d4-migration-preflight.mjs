import assert from "node:assert/strict";
import {
  readFileSync,
  readdirSync
} from "node:fs";

const migrationUrl =
  new URL(
    "../src/database/migrations/019_investor_broker_transaction_history.sql",
    import.meta.url
  );

const migration =
  readFileSync(
    migrationUrl,
    "utf8"
  );

const migrationDirectory =
  new URL(
    "../src/database/migrations/",
    import.meta.url
  );

const migration019Files =
  readdirSync(
    migrationDirectory
  ).filter(
    name => /^019/.test(name)
  );

function pass(label) {
  console.log(
    `${label}=PASS`
  );
}

assert.equal(
  migration019Files.length,
  1
);
pass(
  "MIGRATION_019_NUMBER_UNIQUE"
);

assert.match(
  migration,
  /ALTER TABLE\s+public\.user_broker_links[\s\S]*ADD CONSTRAINT\s+user_broker_links_user_id_id_unique[\s\S]*UNIQUE\s*\(\s*user_id,\s*id\s*\)/i
);
pass(
  "COMPOSITE_PARENT_KEY_PRESENT"
);

assert.match(
  migration,
  /FOREIGN KEY\s*\(\s*user_id,\s*broker_link_id\s*\)[\s\S]*REFERENCES public\.user_broker_links\s*\(\s*user_id,\s*id\s*\)/i
);
pass(
  "COMPOSITE_OWNER_FK_PRESENT"
);

assert.match(
  migration,
  /investor_broker_transaction_history_state_fifo_consistency[\s\S]*historical_execution_state = 'NEEDS_REVIEW'[\s\S]*fifo_eligible = FALSE[\s\S]*can_affect_fifo = FALSE/i
);
pass(
  "NEEDS_REVIEW_FIFO_BLOCKED_BY_DB"
);

assert.match(
  migration,
  /historical_execution_state = 'READY'[\s\S]*execution_confirmed = TRUE[\s\S]*fifo_eligible = TRUE[\s\S]*can_affect_fifo = TRUE/i
);
pass(
  "READY_REQUIRES_CONFIRMED_FIFO_STATE"
);

assert.match(
  migration,
  /historical_execution_state = 'READY'[\s\S]*execution_price IS NOT NULL[\s\S]*execution_price > 0[\s\S]*symbol IS NOT NULL[\s\S]*side IN \('BUY', 'SELL'\)[\s\S]*execution_date IS NOT NULL/i
);
pass(
  "READY_REQUIRES_COMPLETE_FIFO_EVIDENCE"
);

assert.match(
  migration,
  /total_traded_quantity > 0/i
);
pass(
  "POSITIVE_TOTAL_TRADED_PRESERVED"
);

assert.match(
  migration,
  /UNIQUE\s*\(\s*user_id,\s*broker_link_id,\s*broker_account_key,\s*authority_generation,\s*execution_identity\s*\)/i
);
pass(
  "IMMUTABLE_ACCOUNT_IDENTITY_PRESERVED"
);

assert.doesNotMatch(
  migration,
  /^\s*(INSERT|UPDATE|DELETE)\s+/im
);
pass(
  "MIGRATION_HAS_NO_BUSINESS_DATA_MUTATION"
);

console.log(
  "MIGRATION_EXECUTION=NONE"
);

console.log(
  "EXISTING_HISTORY_MIGRATION=NONE"
);

console.log(
  "REAL_HISTORY_RESET=NONE"
);

console.log(
  "ADMIN_TXHIST_004D4_STATIC_PREFLIGHT=PASS"
);
