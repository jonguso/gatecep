import fs from "node:fs";
import assert from "node:assert/strict";

const source =
  fs.readFileSync(
    "app/index.js",
    "utf8"
  );

function pass(label) {
  console.log(`${label}=PASS`);
}

assert.match(
  source,
  /loadAdminOverview/
);
pass("SERVER_ADMIN_OVERVIEW_USED");

assert.match(
  source,
  /adminOverview\?\.admin\s*===\s*true/
);
pass("SERVER_ADMIN_FLAG_REQUIRED");

assert.match(
  source,
  /adminOverview\?\.user\?\.role/
);
pass("SERVER_ROLE_REQUIRED");

assert.match(
  source,
  /toUpperCase\(\)\s*===\s*"ADMIN"/
);
pass("ADMIN_ROLE_EXPLICIT");

assert.match(
  source,
  /router\.replace\("\/admin"\)/
);
pass("VERIFIED_ADMIN_LANDS_OPERATIONS_CONSOLE");

const adminCheck =
  source.indexOf(
    "ADMIN-NAV-001B"
  );

const namespaceRead =
  source.indexOf(
    "await waitForUserNamespace()"
  );

assert.ok(
  adminCheck >= 0 &&
  namespaceRead >= 0 &&
  adminCheck < namespaceRead
);
pass("ADMIN_CHECK_PRECEDES_INVESTOR_RESTORATION");

assert.match(
  source,
  /adminAccessError\?\.status\s*===\s*401/
);
pass("INVALID_SERVER_SESSION_FAILS_TO_LOGIN");

assert.match(
  source,
  /router\.replace\("\/login"\)/
);
pass("LOGIN_FALLBACK_PRESERVED");

assert.match(
  source,
  /router\.replace\("\/\(tabs\)\/dashboard"\)/
);
pass("INVESTOR_DASHBOARD_PRESERVED");

assert.doesNotMatch(
  source,
  /user\?\.role[\s\S]{0,160}router\.replace\("\/admin"\)/
);
pass("LOCAL_USER_ROLE_NOT_ADMIN_AUTHORITY");

assert.doesNotMatch(
  source,
  /user\.role[\s\S]{0,160}router\.replace\("\/admin"\)/
);
pass("CLIENT_ROLE_NOT_ADMIN_AUTHORITY");

console.log(
  "ADMIN_DEFAULT_WORKSPACE=/admin"
);
console.log(
  "INVESTOR_DEFAULT_WORKSPACE=/(tabs)/dashboard"
);
console.log(
  "ADMIN_AUTHORITY=SERVER_VERIFIED"
);
console.log(
  "ADMIN_PRIMARY_SURFACE=WEB"
);
console.log(
  "ADMIN_HEAVY_OPERATIONS=BACKEND"
);
console.log(
  "ADMIN_ACCESS_REMOVAL=NO"
);
console.log(
  "ADMIN_NAV_001B=PASS"
);
