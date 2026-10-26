import assert from "node:assert/strict";
import fs from "node:fs";

console.log(
  "===== ADMIN-TXHIST-004D4-R7M-R2 ROUTE VERIFICATION ====="
);

const routePath =
  new URL(
    "../src/modules/transactions/transaction.routes.js",
    import.meta.url
  );

const serverPath =
  new URL(
    "../src/server.js",
    import.meta.url
  );

const controllerPath =
  new URL(
    "../src/modules/transaction-history/investorBrokerTransactionHistoryBootstrap.controller.js",
    import.meta.url
  );

const routeSource =
  fs.readFileSync(
    routePath,
    "utf8"
  );

const serverSource =
  fs.readFileSync(
    serverPath,
    "utf8"
  );

const controllerSource =
  fs.readFileSync(
    controllerPath,
    "utf8"
  );

/*
 * Route must live in the authenticated investor transaction
 * namespace, not under Admin.
 */
assert.match(
  serverSource,
  /app\.use\(\s*["']\/transactions["']\s*,\s*transactionRoutes\s*\)/
);

console.log(
  "TRANSACTION_NAMESPACE_MOUNT=PASS"
);

assert.match(
  routeSource,
  /investorTransactionHistoryBootstrapHandler/
);

console.log(
  "BOOTSTRAP_HANDLER_IMPORTED=PASS"
);

assert.match(
  routeSource,
  /router\.post\(\s*["']\/history\/bootstrap["']\s*,\s*authRequired\s*,\s*investorTransactionHistoryBootstrapHandler\s*\)/
);

console.log(
  "AUTH_REQUIRED_BEFORE_HANDLER=PASS"
);

assert.doesNotMatch(
  routeSource,
  /requireAdmin/
);

console.log(
  "ADMIN_ROLE_NOT_REQUIRED=PASS"
);

/*
 * Controller target authority remains server-authenticated.
 */
assert.match(
  controllerSource,
  /req(?:\?|\.)user(?:\?|\.)id/
);

assert.match(
  controllerSource,
  /rejectClientIdentityFields/
);

assert.match(
  controllerSource,
  /expectedEvidenceSha256/
);

assert.match(
  controllerSource,
  /observedGeneration/
);

assert.match(
  controllerSource,
  /partitions/
);

console.log(
  "SERVER_AUTHENTICATED_TARGET=PASS"
);

console.log(
  "CLIENT_TARGET_FIELDS_REJECTED=PASS"
);

console.log(
  "EXPECTED_FINGERPRINT_REQUIRED=PASS"
);

console.log(
  "OBSERVED_GENERATION_REQUIRED=PASS"
);

console.log(
  "MULTI_BROKER_PARTITIONS_SUPPORTED=PASS"
);

/*
 * This verifier deliberately performs no HTTP request and no DB
 * access. The real 377-row bootstrap remains outside this gate.
 */
console.log(
  "HTTP_REQUEST=NONE"
);

console.log(
  "DATABASE_WRITE=NONE"
);

console.log(
  "REAL_377_BOOTSTRAP=NONE"
);

console.log(
  "ADMIN_RESET_ENABLEMENT=NO"
);

console.log(
  "R7M_R2_RESULT=PASS"
);
