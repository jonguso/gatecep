import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const repo =
  readFileSync(
    "backend/src/modules/users/users.repository.js",
    "utf8"
  );

const middleware =
  readFileSync(
    "backend/src/middleware/authRequired.js",
    "utf8"
  );

const authService =
  readFileSync(
    "backend/src/modules/auth/auth.service.js",
    "utf8"
  );

const migration =
  readFileSync(
    "backend/src/database/migrations/014_auth_user_status.sql",
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
    console.log(`  ${error.message}`);
  }
}

check(
  "repository exposes persisted status",
  () => {
    const matches =
      repo.match(
        /\bstatus\b/g
      ) || [];

    assert.ok(
      matches.length >= 4
    );
  }
);

check(
  "auth middleware resolves persisted user",
  () => {
    assert.match(
      middleware,
      /findUserById/
    );

    assert.match(
      middleware,
      /await\s+findUserById\(userId\)/
    );
  }
);

check(
  "auth middleware verifies JWT before persisted lookup",
  () => {
    const verifyIndex =
      middleware.indexOf(
        "jwt.verify"
      );

    const lookupIndex =
      middleware.indexOf(
        "await findUserById"
      );

    assert.ok(verifyIndex >= 0);
    assert.ok(lookupIndex > verifyIndex);
  }
);

check(
  "auth middleware rejects missing persisted identity",
  () => {
    assert.match(
      middleware,
      /Authenticated user not found/
    );
  }
);

check(
  "auth middleware requires ACTIVE status",
  () => {
    assert.match(
      middleware,
      /status !== "ACTIVE"/
    );
  }
);

check(
  "disabled authenticated account has canonical error",
  () => {
    assert.match(
      middleware,
      /ACCOUNT_DISABLED/
    );

    assert.match(
      middleware,
      /status\(403\)/
    );
  }
);

check(
  "request identity comes from persisted user",
  () => {
    assert.match(
      middleware,
      /id:\s*user\.id/
    );

    assert.match(
      middleware,
      /email:\s*user\.email/
    );

    assert.match(
      middleware,
      /username:\s*user\.username/
    );

    assert.match(
      middleware,
      /user\.role/
    );
  }
);

check(
  "middleware does not authorize from JWT role claim",
  () => {
    assert.doesNotMatch(
      middleware,
      /role:\s*payload\.role/
    );
  }
);

check(
  "JWT failures remain 401",
  () => {
    assert.match(
      middleware,
      /Invalid or expired token/
    );

    assert.match(
      middleware,
      /status\(401\)/
    );
  }
);

check(
  "unexpected middleware failures flow to error middleware",
  () => {
    assert.match(
      middleware,
      /return next\(error\)/
    );
  }
);

check(
  "login reads persisted account status",
  () => {
    assert.match(
      authService,
      /user\.status/
    );
  }
);

check(
  "login requires ACTIVE account",
  () => {
    assert.match(
      authService,
      /accountStatus !== "ACTIVE"/
    );
  }
);

check(
  "disabled login uses canonical error",
  () => {
    assert.match(
      authService,
      /ACCOUNT_DISABLED/
    );

    assert.match(
      authService,
      /error\.status = 403/
    );
  }
);

check(
  "disabled login is rejected before token signing",
  () => {
    const statusIndex =
      authService.indexOf(
        'accountStatus !== "ACTIVE"'
      );

    const signIndex =
      authService.indexOf(
        "jwt.sign"
      );

    assert.ok(statusIndex >= 0);
    assert.ok(signIndex > statusIndex);
  }
);

check(
  "migration canonicalizes ACTIVE correctly",
  () => {
    assert.match(
      migration,
      /UPPER\(BTRIM\(status\)\)\s*=\s*'ACTIVE'[\s\S]*?THEN 'ACTIVE'/
    );
  }
);

check(
  "migration canonicalizes DISABLED correctly",
  () => {
    assert.match(
      migration,
      /UPPER\(BTRIM\(status\)\)\s*=\s*'DISABLED'[\s\S]*?THEN 'DISABLED'/
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
