import fs from "node:fs";

const path =
  "backend/src/modules/admin-audit/adminAudit.repository.js";

const source =
  fs.readFileSync(path, "utf8");

let assertions = 0;
let failures = 0;

function check(condition, message) {
  assertions += 1;

  if (condition) {
    console.log(
      "PASS: " + message
    );
  } else {
    failures += 1;

    console.log(
      "FAIL: " + message
    );
  }
}

check(
  /export async function appendAdminAuditEvent/.test(
    source
  ),
  "repository exports append operation"
);

check(
  /export async function listAdminAuditEvents/.test(
    source
  ),
  "repository exports read operation"
);

check(
  /INSERT INTO public\.admin_audit_events/i.test(
    source
  ),
  "append writes canonical audit table"
);

check(
  /RETURNING[\s\S]*created_at AS "createdAt"/i.test(
    source
  ),
  "append returns persisted event"
);

check(
  /FROM public\.admin_audit_events/i.test(
    source
  ),
  "list reads canonical audit table"
);

check(
  /ORDER BY[\s\S]*created_at DESC/i.test(
    source
  ),
  "list is newest first"
);

check(
  /LIMIT \$1/i.test(source),
  "list uses bounded parameterized limit"
);

check(
  /Math\.min[\s\S]*200/.test(source),
  "list caps audit history size"
);

check(
  /queryable = pool/.test(source),
  "repository supports transactional queryable"
);

check(
  /assertNoAuditSecrets/.test(source),
  "repository validates secret-bearing fields"
);

check(
  /FORBIDDEN_AUDIT_KEYS/.test(source),
  "repository defines forbidden audit keys"
);

check(
  /password_hash/.test(source),
  "password hash is forbidden"
);

check(
  /authorization/.test(source),
  "authorization field is forbidden"
);

check(
  /access_token/.test(source),
  "access token field is forbidden"
);

check(
  /refresh_token/.test(source),
  "refresh token field is forbidden"
);

check(
  /api_key/.test(source),
  "API key field is forbidden"
);

check(
  /secret/.test(source),
  "secret field is forbidden"
);

check(
  /Array\.isArray/.test(source),
  "secret validation traverses arrays"
);

check(
  /Object\.entries/.test(source),
  "secret validation traverses nested objects"
);

check(
  !/UPDATE\s+public\.admin_audit_events/i.test(
    source
  ),
  "repository contains no audit update"
);

check(
  !/DELETE\s+FROM\s+public\.admin_audit_events/i.test(
    source
  ),
  "repository contains no audit delete"
);

check(
  !/export async function .*delete/i.test(
    source
  ),
  "repository exports no delete operation"
);

check(
  !/export async function .*update/i.test(
    source
  ),
  "repository exports no update operation"
);

console.log("");
console.log(
  "ASSERTIONS=" + assertions
);

console.log(
  "ASSERTION_FAILURES=" + failures
);

if (failures > 0) {
  process.exitCode = 1;
}
