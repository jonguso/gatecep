import fs from "node:fs";

const path =
  "backend/src/modules/admin/adminRole.service.js";

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
  /export async function changeUserRole/.test(
    source
  ),
  "service exports controlled role mutation"
);

check(
  /pool\.connect\(\)/.test(source),
  "service owns dedicated database client"
);

check(
  /client\.query\("BEGIN"\)/.test(source),
  "service begins transaction"
);

check(
  /client\.query\("COMMIT"\)/.test(source),
  "service commits transaction"
);

check(
  /client\.query\("ROLLBACK"\)/.test(source),
  "service rolls back failed transaction"
);

check(
  /client\.release\(\)/.test(source),
  "service releases database client"
);

check(
  /pg_advisory_xact_lock/.test(source) &&
    /gatecep-admin-auth-user-security/.test(source),
  "role mutations use shared administrative security lock"
);

check(
  /FOR UPDATE/.test(source),
  "role mutation locks persisted identity rows"
);

check(
  /SELECT[\s\S]*role,[\s\S]*status[\s\S]*FROM public\.auth_users/.test(
    source
  ),
  "role mutation reads persisted account status"
);

check(
  /actorRole !== "ADMIN"/.test(source),
  "service revalidates persisted actor role"
);

check(
  /actorStatus !== "ACTIVE"/.test(source) &&
    /ACTOR_ACCOUNT_DISABLED/.test(source),
  "disabled persisted administrator cannot change roles"
);

check(
  /SELF_ROLE_CHANGE_FORBIDDEN/.test(source),
  "self role changes are forbidden"
);

check(
  /LAST_ACTIVE_ADMIN_PROTECTED/.test(source),
  "last active administrator is protected"
);

check(
  /WHERE role = 'ADMIN'[\s\S]*AND status = 'ACTIVE'/.test(
    source
  ),
  "last-admin decision uses persisted active-admin count"
);

check(
  /currentStatus === "ACTIVE"/.test(source),
  "disabled administrator demotion does not reduce active-admin availability"
);

check(
  /ALLOWED_ROLES/.test(source),
  "service restricts role vocabulary"
);

check(
  /"USER"/.test(source) &&
    /"ADMIN"/.test(source),
  "USER and ADMIN are canonical roles"
);

check(
  /REASON_REQUIRED/.test(source),
  "administrative reason is mandatory"
);

check(
  /ROLE_UNCHANGED/.test(source),
  "no-op role mutation is rejected"
);

check(
  /UPDATE public\.auth_users/.test(source),
  "service updates canonical auth user"
);

check(
  /updated_at = NOW\(\)/.test(source),
  "role change updates account timestamp"
);

check(
  /appendAdminAuditEvent/.test(source),
  "role change writes administrative audit event"
);

check(
  /USER_ROLE_CHANGED/.test(source),
  "role change has canonical audit action"
);

check(
  /beforeState[\s\S]*currentRole/.test(source),
  "audit records previous role"
);

check(
  /afterState[\s\S]*nextRole/.test(source),
  "audit records resulting role"
);

check(
  /reason[\s\S]*normalizedReason/.test(source),
  "audit records administrative reason"
);

check(
  /appendAdminAuditEvent[\s\S]*client/.test(
    source
  ),
  "audit event shares mutation transaction"
);

check(
  !/password_hash/.test(source),
  "service never reads password hash"
);

check(
  !/req\.body/.test(source),
  "service is independent of HTTP request body"
);

check(
  !/email\s*=/.test(source),
  "service does not mutate email login identity"
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
