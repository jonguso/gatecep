import fs from "node:fs";

const screenPath =
  "mobile/app/admin-audit-history.js";

const directoryPath =
  "mobile/app/admin-users.js";

const screen =
  fs.readFileSync(screenPath, "utf8");

const directory =
  fs.readFileSync(directoryPath, "utf8");

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
  /loadAdminAuditEvents/.test(screen),
  "audit screen uses canonical audit API client"
);

check(
  /useAuth/.test(screen),
  "audit screen derives authenticated access"
);

check(
  /if\s*\(\s*!accessToken\s*\)/.test(screen),
  "audit screen handles missing authentication"
);

check(
  /status === 401/.test(screen),
  "audit screen handles expired authentication"
);

check(
  /status === 403/.test(screen),
  "audit screen handles authorization rejection"
);

check(
  /limit:\s*100/.test(screen),
  "audit screen requests bounded history"
);

check(
  /Administrative Audit History/.test(screen),
  "audit screen has explicit administrative identity"
);

check(
  /read-only administrative evidence/i.test(screen),
  "audit screen declares read-only evidence scope"
);

check(
  /events\.map/.test(screen),
  "audit screen renders server event collection"
);

check(
  /event\.action/.test(screen),
  "audit screen renders canonical action"
);

check(
  /event\.actorUserId/.test(screen),
  "audit screen renders canonical actor"
);

check(
  /event\.targetType/.test(screen) &&
  /event\.targetId/.test(screen),
  "audit screen renders canonical target"
);

check(
  /event\.beforeState/.test(screen) &&
  /event\.afterState/.test(screen),
  "audit screen reads persisted before and after state"
);

check(
  /event\.reason/.test(screen),
  "audit screen renders persisted administrative reason"
);

check(
  /event\.createdAt/.test(screen),
  "audit screen renders persisted timestamp"
);

check(
  /No administrative audit events are available/.test(
    screen
  ),
  "audit screen has explicit empty state"
);

check(
  /Try Again/.test(screen),
  "audit screen exposes read-only retry"
);

check(
  /gatecep-admin-audit-history/.test(screen),
  "audit screen has stable screen identity"
);

check(
  /admin-audit-event-/.test(screen),
  "audit events have stable test identity"
);

check(
  !/clearAdmin|deleteAdmin|removeAdmin|clearAudit/i.test(
    screen
  ),
  "audit screen exposes no audit deletion control"
);

check(
  !/method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i.test(
    screen
  ),
  "audit screen performs no direct mutation request"
);

check(
  !/TextInput/.test(screen),
  "audit history contains no editable evidence input"
);

check(
  /admin-audit-history-link/.test(directory),
  "user administration exposes audit history navigation"
);

check(
  /router\.push\(["']\/admin-audit-history["']\)/.test(
    directory
  ),
  "audit navigation targets dedicated admin history screen"
);

check(
  !/execution-audit/.test(screen),
  "administrative audit screen remains separate from execution audit"
);

console.log("");
console.log("ASSERTIONS=" + assertions);
console.log(
  "ASSERTION_FAILURES=" + failures
);

if (failures > 0) {
  process.exitCode = 1;
}
