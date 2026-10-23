import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT =
  process.cwd();

const UI_PATH =
  path.join(
    ROOT,
    "mobile",
    "app",
    "admin-users.js"
  );

const source =
  fs.readFileSync(
    UI_PATH,
    "utf8"
  ).replace(/\r\n/g, "\n");

let passed = 0;

function check(
  name,
  condition
) {
  assert.ok(
    condition,
    name
  );

  passed += 1;

  console.log(
    `PASS ${passed}: ${name}`
  );
}

console.log(
  "===== ADMIN-003D5 — ACCOUNT STATUS UI CONTRACT ====="
);

/*
 * ----------------------------------------------------------
 * API + STATE FOUNDATION
 * ----------------------------------------------------------
 */

check(
  "status mutation API is imported",
  source.includes(
    "changeAdminUserStatus,"
  )
);

check(
  "status editor state exists",
  source.includes(
    "const [statusEditor, setStatusEditor]"
  )
);

check(
  "status reason state exists",
  source.includes(
    "const [statusReason, setStatusReason]"
  )
);

check(
  "status submitting state exists",
  source.includes(
    "const [statusSubmitting, setStatusSubmitting]"
  )
);

check(
  "status feedback state exists",
  source.includes(
    "const [statusFeedback, setStatusFeedback]"
  )
);

/*
 * ----------------------------------------------------------
 * CARD STATUS + ACTION
 * ----------------------------------------------------------
 */

check(
  "account status is visibly labelled",
  source.includes(
    "Account status"
  )
);

check(
  "missing status has ACTIVE compatibility fallback",
  source.includes(
    'entry.status || "ACTIVE"'
  )
);

check(
  "per-user status action has stable test id",
  source.includes(
    "admin-change-status-${entry.id}"
  )
);

check(
  "active account exposes disable action",
  source.includes(
    '"Disable Account"'
  )
);

check(
  "disabled account exposes enable action",
  source.includes(
    '"Enable Account"'
  )
);

/*
 * ----------------------------------------------------------
 * CONTROLLED STATUS TRANSITION
 * ----------------------------------------------------------
 */

check(
  "status change handler exists",
  source.includes(
    "function beginStatusChange(entry)"
  )
);

check(
  "status transition supports DISABLED to ACTIVE",
  source.includes(
    'currentStatus === "DISABLED"'
  ) &&
  source.includes(
    '? "ACTIVE"'
  )
);

check(
  "status transition supports ACTIVE to DISABLED",
  source.includes(
    ': "DISABLED"'
  )
);

check(
  "status editor has stable control id",
  source.includes(
    'testID="admin-status-control"'
  )
);

check(
  "status reason input has stable id",
  source.includes(
    'testID="admin-status-reason"'
  )
);

check(
  "status cancel action has stable id",
  source.includes(
    'testID="admin-status-cancel"'
  )
);

check(
  "status confirm action has stable id",
  source.includes(
    'testID="admin-status-confirm"'
  )
);

/*
 * ----------------------------------------------------------
 * REASON + EXPLICIT CONFIRMATION
 * ----------------------------------------------------------
 */

check(
  "administrative reason is mandatory",
  source.includes(
    '"Administrative reason is required."'
  )
);

check(
  "disable confirmation is explicit",
  source.includes(
    '"Confirm Account Disable"'
  )
);

check(
  "enable confirmation is explicit",
  source.includes(
    '"Confirm Account Enable"'
  )
);

check(
  "disable review action is explicit",
  source.includes(
    '"Review & Confirm Disable"'
  )
);

check(
  "enable review action is explicit",
  source.includes(
    '"Review & Confirm Enable"'
  )
);

/*
 * ----------------------------------------------------------
 * SERVER-AUTHORITATIVE MUTATION
 * ----------------------------------------------------------
 */

check(
  "status mutation delegates to admin API",
  source.includes(
    "await changeAdminUserStatus({"
  )
);

check(
  "mutation supplies authenticated access token",
  source.includes(
    "accessToken,"
  )
);

check(
  "mutation supplies target user id",
  source.includes(
    "userId: statusEditor.userId"
  )
);

check(
  "mutation supplies requested status",
  source.includes(
    "status: statusEditor.requestedStatus"
  )
);

check(
  "mutation supplies administrative reason",
  source.includes(
    "reason"
  )
);

check(
  "directory is authoritatively reloaded",
  source.includes(
    "await loadAdminUsers(accessToken)"
  )
);

check(
  "refreshed users replace local directory",
  source.includes(
    "setUsers(refreshed)"
  )
);

/*
 * ----------------------------------------------------------
 * CROSS-EDITOR MUTATION SAFETY
 * ----------------------------------------------------------
 */

const beginRoleStart =
  source.indexOf(
    "function beginRoleChange(entry)"
  );

const beginRoleEnd =
  source.indexOf(
    "function cancelRoleChange()",
    beginRoleStart
  );

const beginRoleSource =
  beginRoleStart >= 0 &&
  beginRoleEnd > beginRoleStart
    ? source.slice(
        beginRoleStart,
        beginRoleEnd
      )
    : "";

check(
  "role handler blocks while status editor is active",
  beginRoleSource.includes(
    "statusEditor"
  )
);

const beginStatusStart =
  source.indexOf(
    "function beginStatusChange(entry)"
  );

const beginStatusEnd =
  source.indexOf(
    "function cancelStatusChange()",
    beginStatusStart
  );

const beginStatusSource =
  beginStatusStart >= 0 &&
  beginStatusEnd > beginStatusStart
    ? source.slice(
        beginStatusStart,
        beginStatusEnd
      )
    : "";

check(
  "status handler blocks while role editor is active",
  beginStatusSource.includes(
    "roleEditor"
  )
);

check(
  "role card action is disabled during status editing",
  source.includes(
    "Boolean(statusEditor)"
  )
);

check(
  "status card action is disabled during role editing",
  source.includes(
    "Boolean(roleEditor)"
  )
);

/*
 * ----------------------------------------------------------
 * FEEDBACK + BOUNDARY
 * ----------------------------------------------------------
 */

check(
  "status success feedback survives editor closure",
  source.includes(
    "statusFeedback && !statusEditor"
  )
);

check(
  "disable success feedback exists",
  source.includes(
    '"Account disabled successfully."'
  )
);

check(
  "enable success feedback exists",
  source.includes(
    '"Account enabled successfully."'
  )
);

check(
  "status control states access-only boundary",
  source.includes(
    "This control changes account access status"
  )
);

check(
  "identity fields remain outside status mutation boundary",
  source.includes(
    "Role, email, username, password and"
  ) &&
  source.includes(
    "login identity are not editable here."
  )
);

check(
  "screen summary includes account-access administration",
  source.includes(
    "controlled role and account-access administration"
  )
);

/*
 * ----------------------------------------------------------
 * NEGATIVE BOUNDARIES
 * ----------------------------------------------------------
 */

const statusSubmitStart =
  source.indexOf(
    "async function submitStatusChange()"
  );

const statusSubmitEnd =
  source.indexOf(
    "async function submitRoleChange()",
    statusSubmitStart
  );

const statusSubmitSource =
  statusSubmitStart >= 0 &&
  statusSubmitEnd > statusSubmitStart
    ? source.slice(
        statusSubmitStart,
        statusSubmitEnd
      )
    : "";

check(
  "status submit does not call role mutation API",
  !statusSubmitSource.includes(
    "changeAdminUserRole("
  )
);

check(
  "status submit does not mutate email",
  !statusSubmitSource.includes(
    "email:"
  )
);

check(
  "status submit does not mutate username",
  !statusSubmitSource.includes(
    "username:"
  )
);

check(
  "status submit does not mutate password",
  !statusSubmitSource.includes(
    "password:"
  ) &&
  !statusSubmitSource.includes(
    "passwordHash"
  )
);

console.log();
console.log(
  `ADMIN-003D5-STATUS-UI=${passed}/${passed} PASS`
);
