import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const source =
  readFileSync(
    "backend/src/modules/admin/adminAccountStatus.service.js",
    "utf8"
  );

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
  "service exports controlled status mutation",
  () => {
    assert.match(
      source,
      /export async function changeAdminUserStatus/
    );
  }
);

check(
  "service owns dedicated database client",
  () => {
    assert.match(
      source,
      /await pool\.connect\(\)/
    );
  }
);

check(
  "service begins transaction",
  () => {
    assert.match(
      source,
      /client\.query\("BEGIN"\)/
    );
  }
);

check(
  "service commits transaction",
  () => {
    assert.match(
      source,
      /client\.query\("COMMIT"\)/
    );
  }
);

check(
  "service rolls back failed transaction",
  () => {
    assert.match(
      source,
      /client\.query\(\s*"ROLLBACK"/
    );
  }
);

check(
  "service releases database client",
  () => {
    assert.match(
      source,
      /client\.release\(\)/
    );
  }
);

check(
  "status mutation uses transaction advisory lock",
  () => {
    assert.match(
      source,
      /pg_advisory_xact_lock/
    );
  }
);

check(
  "service locks persisted identities",
  () => {
    const locks =
      source.match(
        /FOR UPDATE/g
      ) || [];

    assert.ok(
      locks.length >= 2
    );
  }
);

check(
  "service revalidates persisted actor role",
  () => {
    assert.match(
      source,
      /canonicalRole\(actor\.role\)/
    );

    assert.match(
      source,
      /ADMIN_REQUIRED/
    );
  }
);

check(
  "service requires active persisted actor",
  () => {
    assert.match(
      source,
      /canonicalStatus\(actor\.status\)/
    );

    assert.match(
      source,
      /ACTOR_ACCOUNT_DISABLED/
    );
  }
);

check(
  "service restricts account status vocabulary",
  () => {
    assert.match(
      source,
      /"ACTIVE"/
    );

    assert.match(
      source,
      /"DISABLED"/
    );

    assert.match(
      source,
      /INVALID_ACCOUNT_STATUS/
    );
  }
);

check(
  "administrative reason is mandatory",
  () => {
    assert.match(
      source,
      /ADMIN_REASON_REQUIRED/
    );
  }
);

check(
  "self disable is forbidden",
  () => {
    assert.match(
      source,
      /SELF_DISABLE_FORBIDDEN/
    );
  }
);

check(
  "no-op status mutation is rejected",
  () => {
    assert.match(
      source,
      /ACCOUNT_STATUS_UNCHANGED/
    );
  }
);

check(
  "final active administrator is protected",
  () => {
    assert.match(
      source,
      /LAST_ACTIVE_ADMIN_PROTECTED/
    );

    assert.match(
      source,
      /role = 'ADMIN'[\s\S]*status = 'ACTIVE'/
    );
  }
);

check(
  "last-active-admin decision uses persisted count",
  () => {
    assert.match(
      source,
      /COUNT\(\*\)::integer AS count/
    );

    assert.match(
      source,
      /activeAdminCount <= 1/
    );
  }
);

check(
  "service updates canonical auth user status",
  () => {
    assert.match(
      source,
      /UPDATE public\.auth_users/
    );

    assert.match(
      source,
      /status = \$2/
    );
  }
);

check(
  "status change updates account timestamp",
  () => {
    assert.match(
      source,
      /updated_at = NOW\(\)/
    );
  }
);

check(
  "service writes canonical administrative audit event",
  () => {
    assert.match(
      source,
      /appendAdminAuditEvent/
    );
  }
);

check(
  "disable has canonical audit action",
  () => {
    assert.match(
      source,
      /USER_ACCOUNT_DISABLED/
    );
  }
);

check(
  "enable has canonical audit action",
  () => {
    assert.match(
      source,
      /USER_ACCOUNT_ENABLED/
    );
  }
);

check(
  "audit records previous status",
  () => {
    assert.match(
      source,
      /beforeState:\s*\{\s*status:\s*currentStatus/
    );
  }
);

check(
  "audit records resulting status",
  () => {
    assert.match(
      source,
      /afterState:\s*\{\s*status:\s*nextStatus/
    );
  }
);

check(
  "audit records administrative reason",
  () => {
    assert.match(
      source,
      /reason:\s*normalizedReason/
    );
  }
);

check(
  "audit event shares mutation transaction",
  () => {
    assert.match(
      source,
      /appendAdminAuditEvent\([\s\S]*?,\s*client\s*\)/
    );
  }
);

check(
  "service does not mutate role",
  () => {
    assert.doesNotMatch(
      source,
      /SET[\s\S]{0,120}\brole\s*=/
    );
  }
);

check(
  "service does not mutate login identity",
  () => {
    assert.doesNotMatch(
      source,
      /SET[\s\S]{0,120}\bemail\s*=/
    );

    assert.doesNotMatch(
      source,
      /SET[\s\S]{0,120}\busername\s*=/
    );
  }
);

check(
  "service never reads password hash",
  () => {
    assert.doesNotMatch(
      source,
      /password_hash/
    );
  }
);

check(
  "service is independent of HTTP request body",
  () => {
    assert.doesNotMatch(
      source,
      /\breq\.body\b/
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
