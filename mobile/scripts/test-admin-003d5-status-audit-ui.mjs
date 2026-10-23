import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const screen =
  readFileSync(
    "mobile/app/admin-audit-history.js",
    "utf8"
  ).replace(/\r\n/g, "\n");

const service =
  readFileSync(
    "backend/src/modules/admin/adminAccountStatus.service.js",
    "utf8"
  ).replace(/\r\n/g, "\n");

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
    console.log(`  ${error.message}`);
  }
}

check(
  "status audit service records disable action",
  () => {
    assert.match(
      service,
      /USER_ACCOUNT_DISABLED/
    );
  }
);

check(
  "status audit service records enable action",
  () => {
    assert.match(
      service,
      /USER_ACCOUNT_ENABLED/
    );
  }
);

check(
  "status audit service persists previous status",
  () => {
    assert.match(
      service,
      /beforeState:\s*\{\s*status:\s*currentStatus\s*\}/
    );
  }
);

check(
  "status audit service persists resulting status",
  () => {
    assert.match(
      service,
      /afterState:\s*\{\s*status:\s*nextStatus\s*\}/
    );
  }
);

check(
  "audit screen has canonical status helper",
  () => {
    assert.match(
      screen,
      /function\s+stateStatus\(state\)/
    );
  }
);

check(
  "status helper reads persisted status",
  () => {
    assert.match(
      screen,
      /String\(state\?\.status\s*\|\|\s*""\)/
    );
  }
);

check(
  "status helper canonicalizes case",
  () => {
    assert.match(
      screen,
      /function\s+stateStatus[\s\S]*?\.toUpperCase\(\)/
    );
  }
);

check(
  "audit screen derives previous account status",
  () => {
    assert.match(
      screen,
      /const\s+beforeStatus\s*=\s*stateStatus\(event\.beforeState\)/
    );
  }
);

check(
  "audit screen derives resulting account status",
  () => {
    assert.match(
      screen,
      /const\s+afterStatus\s*=\s*stateStatus\(event\.afterState\)/
    );
  }
);

check(
  "status transition is conditional on persisted state",
  () => {
    assert.match(
      screen,
      /\{beforeStatus\s*\|\|\s*afterStatus\s*\?\s*\(/
    );
  }
);

check(
  "status transition has explicit account status label",
  () => {
    assert.match(
      screen,
      /Account status/
    );
  }
);

check(
  "status transition has stable test identity",
  () => {
    assert.match(
      screen,
      /admin-audit-status-transition-\$\{index\}/
    );
  }
);

check(
  "status transition renders previous status",
  () => {
    assert.match(
      screen,
      /\{beforeStatus\s*\|\|\s*"N\/A"\}/
    );
  }
);

check(
  "status transition renders resulting status",
  () => {
    assert.match(
      screen,
      /\{afterStatus\s*\|\|\s*"N\/A"\}/
    );
  }
);

check(
  "existing role transition remains present",
  () => {
    assert.match(
      screen,
      /stateRole\(event\.beforeState\)/
    );

    assert.match(
      screen,
      /stateRole\(event\.afterState\)/
    );

    assert.match(
      screen,
      />\s*Role\s*</
    );
  }
);

check(
  "audit screen remains read only",
  () => {
    assert.doesNotMatch(
      screen,
      /clearAdmin|deleteAdmin|removeAdmin|clearAudit/i
    );

    assert.doesNotMatch(
      screen,
      /method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i
    );

    assert.doesNotMatch(
      screen,
      /TextInput/
    );
  }
);

console.log();
console.log(`ASSERTIONS=${assertions}`);
console.log(`ASSERTION_FAILURES=${failures}`);

if (failures > 0) {
  process.exitCode = 1;
}
