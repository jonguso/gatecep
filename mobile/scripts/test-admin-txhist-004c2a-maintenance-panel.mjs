import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log(
  "===== ADMIN-TXHIST-004C2A VERIFIER ====="
);

const root =
  process.cwd();

const apiPath =
  path.resolve(
    root,
    "mobile/src/features/admin/api/adminApi.js"
  );

const screenPath =
  path.resolve(
    root,
    "mobile/app/admin-transaction-history-maintenance.js"
  );

const reconPath =
  path.resolve(
    root,
    "mobile/app/admin-broker-reconciliation.js"
  );

const api =
  fs.readFileSync(
    apiPath,
    "utf8"
  );

const screen =
  fs.readFileSync(
    screenPath,
    "utf8"
  );

const recon =
  fs.readFileSync(
    reconPath,
    "utf8"
  );

assert.match(
  api,
  /export async function loadAdminBrokerTransactionHistoryBackup/
);

assert.match(
  api,
  /\/transaction-history\/backup/
);

assert.match(
  api,
  /Authorization:\s*`Bearer \$\{accessToken\}`/s
);

assert.doesNotMatch(
  api,
  /export async function resetAdminBrokerTransactionHistory/
);

console.log(
  "BACKUP_API_CLIENT=PASS"
);

console.log(
  "RESET_API_CLIENT_ABSENT=PASS"
);

assert.match(
  screen,
  /AdminAccessGate/
);

assert.match(
  screen,
  /useAdminAuthorization/
);

assert.match(
  screen,
  /loadAdminReconciliationTargets/
);

assert.match(
  screen,
  /loadAdminTargetBrokerLinks/
);

assert.match(
  screen,
  /loadAdminBrokerTransactionHistoryBackup/
);

console.log(
  "ADMIN_GATE=PASS"
);

console.log(
  "EXISTING_TARGET_SELECTION_REUSED=PASS"
);

console.log(
  "EXISTING_BROKER_SELECTION_REUSED=PASS"
);

assert.match(
  screen,
  /Generate Backup Preview/
);

assert.match(
  screen,
  /Reset remains disabled/
);

assert.doesNotMatch(
  screen,
  /transaction-history\/reset/
);

assert.doesNotMatch(
  screen,
  /resetAdminBrokerTransactionHistory/
);

assert.doesNotMatch(
  screen,
  /resetAllBrokerTransactionHistoryEvidence/
);

assert.doesNotMatch(
  screen,
  /resetBrokerTransactionHistoryEvidence/
);

console.log(
  "BACKUP_PREVIEW_UI=PASS"
);

console.log(
  "RESET_UI_NOT_CONNECTED=PASS"
);

console.log(
  "LOCAL_DEVICE_RESET_NOT_AUTHORITY=PASS"
);

assert.match(
  recon,
  /\/admin-transaction-history-maintenance/
);

console.log(
  "BROKER_RECONCILIATION_ENTRY=PASS"
);

/*
 * The maintenance screen must invalidate backup state when
 * investor or broker selection changes.
 */
const backupInvalidations =
  (
    screen.match(
      /setBackup\(null\)/g
    ) || []
  ).length;

assert.ok(
  backupInvalidations >= 3,
  "Backup must be invalidated when maintenance context changes."
);

console.log(
  "BACKUP_CONTEXT_INVALIDATION=PASS"
);

/*
 * This verifier is static only. It must not import or execute
 * the screen/API modules, because doing so could initiate a
 * network request through React lifecycle code.
 */
console.log(
  "REAL_BACKUP_API_CALL=NONE"
);

console.log(
  "REAL_RESET_API_CALL=NONE"
);

console.log(
  "DATABASE_WRITE=NONE"
);

console.log(
  "REAL_HISTORY_RESET=NONE"
);

console.log(
  "ADMIN_TXHIST_004C2A=PASS"
);
