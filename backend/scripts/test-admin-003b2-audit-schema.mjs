import fs from "node:fs";

const path =
  "backend/src/database/migrations/013_admin_audit_events.sql";

const sql =
  fs.readFileSync(path, "utf8");

let assertions = 0;
let failures = 0;

function check(condition, message) {
  assertions += 1;

  if (condition) {
    console.log("PASS: " + message);
  } else {
    failures += 1;
    console.log("FAIL: " + message);
  }
}

check(
  /BEGIN\s*;/i.test(sql),
  "migration is transactional"
);

check(
  /COMMIT\s*;/i.test(sql),
  "migration commits transaction"
);

check(
  /CREATE TABLE IF NOT EXISTS public\.admin_audit_events/i.test(sql),
  "dedicated admin audit table exists"
);

check(
  /id UUID PRIMARY KEY/i.test(sql),
  "audit event has immutable identity"
);

check(
  /actor_user_id UUID NOT NULL/i.test(sql),
  "audit event requires actor"
);

check(
  /REFERENCES public\.auth_users\(id\)/i.test(sql),
  "actor references canonical auth user"
);

check(
  /action TEXT NOT NULL/i.test(sql),
  "audit event requires action"
);

check(
  /target_type TEXT NOT NULL/i.test(sql),
  "audit event requires target type"
);

check(
  /target_id TEXT/i.test(sql),
  "audit event supports target identity"
);

check(
  /before_state JSONB/i.test(sql),
  "audit event supports before state"
);

check(
  /after_state JSONB/i.test(sql),
  "audit event supports after state"
);

check(
  /reason TEXT/i.test(sql),
  "audit event supports administrative reason"
);

check(
  /metadata JSONB NOT NULL DEFAULT '\{\}'::jsonb/i.test(sql),
  "audit metadata defaults to object"
);

check(
  /created_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/i.test(sql),
  "audit event receives server timestamp"
);

check(
  /jsonb_typeof\(metadata\) = 'object'/i.test(sql),
  "metadata must be JSON object"
);

check(
  /jsonb_typeof\(before_state\) = 'object'/i.test(sql),
  "before state must be JSON object when present"
);

check(
  /jsonb_typeof\(after_state\) = 'object'/i.test(sql),
  "after state must be JSON object when present"
);

check(
  /idx_admin_audit_events_created_at/i.test(sql),
  "audit history has chronological index"
);

check(
  /idx_admin_audit_events_actor_created/i.test(sql),
  "audit history has actor index"
);

check(
  /idx_admin_audit_events_target_created/i.test(sql),
  "audit history has target index"
);

check(
  !/\bUPDATE\s+public\.admin_audit_events/i.test(sql),
  "migration contains no audit-event update"
);

check(
  !/\bDELETE\s+FROM\s+public\.admin_audit_events/i.test(sql),
  "migration contains no audit-event delete"
);

check(
  !/password_hash|authorization|jwt|api_key|access_token|refresh_token/i.test(sql),
  "schema contains no secret-bearing columns"
);

console.log("");
console.log("ASSERTIONS=" + assertions);
console.log("ASSERTION_FAILURES=" + failures);

if (failures > 0) {
  process.exitCode = 1;
}
