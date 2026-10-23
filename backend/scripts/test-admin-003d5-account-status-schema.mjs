import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const path =
  "backend/src/database/migrations/014_auth_user_status.sql";

const source =
  readFileSync(path, "utf8");

let assertions = 0;
let failures = 0;

function check(label, fn) {
  try {
    fn();
    assertions += 1;
    console.log(`PASS: ${label}`);
  } catch (error) {
    assertions += 1;
    failures += 1;
    console.log(`FAIL: ${label}`);
    console.log(
      `  ${error.message}`
    );
  }
}

check(
  "migration is transactional",
  () => {
    assert.match(
      source,
      /\bBEGIN\s*;/i
    );

    assert.match(
      source,
      /\bCOMMIT\s*;/i
    );
  }
);

check(
  "migration targets canonical auth_users table",
  () => {
    assert.match(
      source,
      /ALTER TABLE\s+public\.auth_users/i
    );
  }
);

check(
  "status column is additive",
  () => {
    assert.match(
      source,
      /ADD COLUMN IF NOT EXISTS status TEXT/i
    );
  }
);

check(
  "legacy status values are validated",
  () => {
    assert.match(
      source,
      /Unsupported legacy auth_users status value detected/
    );
  }
);

check(
  "status vocabulary is ACTIVE and DISABLED",
  () => {
    assert.match(
      source,
      /NOT IN\s*\(\s*'ACTIVE'\s*,\s*'DISABLED'\s*\)/i
    );

    assert.match(
      source,
      /CHECK\s*\(\s*status\s+IN\s*\(\s*'ACTIVE'\s*,\s*'DISABLED'\s*\)\s*\)/i
    );
  }
);

check(
  "existing accounts default to ACTIVE",
  () => {
    assert.match(
      source,
      /WHEN status IS NULL THEN 'ACTIVE'/i
    );
  }
);

check(
  "legacy active value is canonicalized",
  () => {
    assert.match(
      source,
      /UPPER\(BTRIM\(status\)\)\s*=\s*'active'[\s\S]*?THEN 'ACTIVE'/i
    );
  }
);

check(
  "legacy disabled value is canonicalized",
  () => {
    assert.match(
      source,
      /UPPER\(BTRIM\(status\)\)\s*=\s*'disabled'[\s\S]*?THEN 'DISABLED'/i
    );
  }
);

check(
  "new accounts default to ACTIVE",
  () => {
    assert.match(
      source,
      /ALTER COLUMN status SET DEFAULT 'ACTIVE'/i
    );
  }
);

check(
  "status cannot be null",
  () => {
    assert.match(
      source,
      /ALTER COLUMN status SET NOT NULL/i
    );
  }
);

check(
  "canonical status constraint is named",
  () => {
    assert.match(
      source,
      /auth_users_status_check/
    );
  }
);

check(
  "migration does not alter role vocabulary",
  () => {
    assert.doesNotMatch(
      source,
      /auth_users_role_check/
    );
  }
);

check(
  "migration does not mutate passwords",
  () => {
    assert.doesNotMatch(
      source,
      /password_hash\s*=/i
    );
  }
);

check(
  "migration does not delete users",
  () => {
    assert.doesNotMatch(
      source,
      /\bDELETE\s+FROM\s+public\.auth_users/i
    );
  }
);

check(
  "migration does not drop auth_users",
  () => {
    assert.doesNotMatch(
      source,
      /\bDROP\s+TABLE\s+(?:IF EXISTS\s+)?public\.auth_users/i
    );
  }
);

console.log();
console.log(
  `ASSERTIONS=${assertions}`
);
console.log(
  `ASSERTION_FAILURES=${failures}`
);

if (failures > 0) {
  process.exitCode = 1;
}
