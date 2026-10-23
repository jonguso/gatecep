import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const path =
  new URL(
    "../src/modules/admin/adminReconciliationTarget.service.js",
    import.meta.url
  );

const source =
  readFileSync(path, "utf8");

let passed = 0;

function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log("PASS:", name);
}

check(
  "imports persisted user lookup",
  source.includes("findUserById")
);

check(
  "imports administrative user directory",
  source.includes("listUsersForAdmin")
);

check(
  "imports server-owned broker links",
  source.includes("getUserBrokerLinks")
);

check(
  "requires explicit target user id",
  source.includes("RECONCILIATION_TARGET_REQUIRED")
);

check(
  "rejects missing target",
  source.includes("RECONCILIATION_TARGET_NOT_FOUND")
);

check(
  "rejects non-USER target",
  source.includes("RECONCILIATION_TARGET_ROLE_FORBIDDEN")
);

check(
  "rejects inactive target",
  source.includes("RECONCILIATION_TARGET_INACTIVE")
);

check(
  "eligible target role is USER",
  source.includes('toUpperCase() === "USER"')
);

check(
  "eligible target status is ACTIVE",
  source.includes('toUpperCase() === "ACTIVE"')
);

check(
  "broker lookup uses validated target identity",
  source.includes(
    "getUserBrokerLinks(user.id)"
  )
);

check(
  "does not accept actor id as broker owner",
  !source.includes("actorUserId")
);

check(
  "does not reference req.user",
  !source.includes("req.user")
);

check(
  "does not reference mobile user storage",
  !source.includes("userGetItem") &&
  !source.includes("userSetItem")
);

check(
  "does not mutate broker links",
  !source.includes("createBrokerLink")
);

check(
  "does not mutate portfolio",
  !source.includes(
    "replaceAuthoritativePortfolioSnapshot"
  ) &&
  !source.includes(
    "replaceUserPortfolioSnapshot"
  )
);

check(
  "safe target excludes password hash",
  !source.match(
    /safeTarget[\s\S]*passwordHash[\s\S]*?\}/
  )
);

console.log(
  `ADMIN_003D6_R6C_PASS=${passed}/16`
);
