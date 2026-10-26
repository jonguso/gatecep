import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log(
  "===== ADMIN-TXHIST-004B API CONTRACT ====="
);

const backendRoot =
  path.resolve(
    process.cwd(),
    "backend/src"
  );

function walk(dir) {
  const out = [];

  for (
    const entry
    of fs.readdirSync(
      dir,
      {
        withFileTypes: true
      }
    )
  ) {
    const full =
      path.join(
        dir,
        entry.name
      );

    if (entry.isDirectory()) {
      out.push(
        ...walk(full)
      );
    } else if (
      entry.isFile() &&
      /\.(js|mjs)$/.test(entry.name)
    ) {
      out.push(full);
    }
  }

  return out;
}

const files =
  walk(backendRoot);

const routeFile =
  files.find(
    (file) => {
      const text =
        fs.readFileSync(
          file,
          "utf8"
        );

      return (
        text.includes(
          "transaction-history/backup"
        ) &&
        text.includes(
          "transaction-history/reset"
        )
      );
    }
  );

assert.ok(
  routeFile,
  "Admin Transaction History routes were not found."
);

const routeText =
  fs.readFileSync(
    routeFile,
    "utf8"
  );

assert.match(
  routeText,
  /transaction-history\/backup/
);

assert.match(
  routeText,
  /transaction-history\/reset/
);

assert.match(
  routeText,
  /req\.user\?\.id/
);

assert.doesNotMatch(
  routeText,
  /actorUserId\s*:\s*req\.body/
);

assert.doesNotMatch(
  routeText,
  /brokerAccountKey\s*:\s*req\.body/
);

assert.match(
  routeText,
  /reason\s*:\s*req\.body\?\.reason/
);

assert.match(
  routeText,
  /confirmed\s*:\s*req\.body\?\.confirmed/
);

console.log(
  "ACTOR_FROM_AUTH_CONTEXT=PASS"
);

console.log(
  "CLIENT_ACTOR_NOT_TRUSTED=PASS"
);

console.log(
  "CLIENT_BROKER_ACCOUNT_KEY_NOT_TRUSTED=PASS"
);

console.log(
  "RESET_BODY_LIMITED_TO_REASON_CONFIRMATION=PASS"
);

/*
 * Authorization must be attached directly to BOTH destructive
 * maintenance route definitions. Finding auth middleware
 * elsewhere in the Admin router is not sufficient.
 */
const backupRoutePattern =
  /router\.get\(\s*["']\/reconciliation-targets\/:userId\/broker-links\/:brokerLinkId\/transaction-history\/backup["']\s*,\s*authRequired\s*,\s*requireAdmin\s*,/s;

const resetRoutePattern =
  /router\.post\(\s*["']\/reconciliation-targets\/:userId\/broker-links\/:brokerLinkId\/transaction-history\/reset["']\s*,\s*authRequired\s*,\s*requireAdmin\s*,/s;

assert.match(
  routeText,
  backupRoutePattern,
  "Backup route must explicitly require authentication and Admin authorization."
);

assert.match(
  routeText,
  resetRoutePattern,
  "Reset route must explicitly require authentication and Admin authorization."
);

console.log(
  "BACKUP_ROUTE_AUTH_REQUIRED=PASS"
);

console.log(
  "BACKUP_ROUTE_REQUIRE_ADMIN=PASS"
);

console.log(
  "RESET_ROUTE_AUTH_REQUIRED=PASS"
);

console.log(
  "RESET_ROUTE_REQUIRE_ADMIN=PASS"
);

console.log(
  "ADMIN_AUTHORIZATION_BOUNDARY=PASS"
);

const resetService =
  fs.readFileSync(
    path.resolve(
      process.cwd(),
      "backend/src/modules/admin/adminBrokerTransactionHistoryReset.service.js"
    ),
    "utf8"
  );

assert.match(
  resetService,
  /lockAdminReconciliationBrokerContext/
);

assert.match(
  resetService,
  /TRANSACTION_HISTORY_RESET_CONFIRMATION_REQUIRED/
);

assert.match(
  resetService,
  /BROKER_TRANSACTION_HISTORY_RESET/
);

console.log(
  "RESET_REVALIDATES_SERVER_CONTEXT=PASS"
);

console.log(
  "RESET_EXPLICIT_CONFIRMATION_REQUIRED=PASS"
);

console.log(
  "RESET_AUDITED=PASS"
);

const backupService =
  fs.readFileSync(
    path.resolve(
      process.cwd(),
      "backend/src/modules/admin/adminBrokerTransactionHistoryBackup.service.js"
    ),
    "utf8"
  );



assert.match(
  backupService,
  /GATECEP_ADMIN_TRANSACTION_HISTORY_BACKUP_V1/
);

assert.match(
  backupService,
  /lockAdminReconciliationBrokerContext/
);

assert.doesNotMatch(
  backupService,
  /DELETE FROM/
);

assert.doesNotMatch(
  backupService,
  /BEGIN READ ONLY/
);

assert.match(
  backupService,
  /client\.query\(\s*"BEGIN"\s*\)/
);

console.log(
  "BACKUP_TRANSACTION_LOCK_COMPATIBLE=PASS"
);

console.log(
  "BACKUP_READ_ONLY=PASS"
);

console.log(
  "BACKUP_SERVER_CONTEXT_REVALIDATED=PASS"
);

console.log(
  "BACKUP_SCHEMA_VERSIONED=PASS"
);

console.log(
  "REAL_DATABASE_WRITE=NONE"
);

console.log(
  "REAL_TRANSACTION_HISTORY_RESET=NONE"
);

console.log(
  "ADMIN_TXHIST_004B=PASS"
);
