import fs from "node:fs";

const directory =
  fs.readFileSync(
    "mobile/app/admin-users.js",
    "utf8"
  );

const api =
  fs.readFileSync(
    "mobile/src/features/admin/api/adminApi.js",
    "utf8"
  );

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
  /changeAdminUserRole/.test(directory),
  "directory uses controlled role mutation client"
);

check(
  /loadAdminUsers/.test(directory),
  "directory retains canonical server loader"
);

check(
  /currentRole === "ADMIN"[\s\S]*\? "USER"[\s\S]*: "ADMIN"/.test(
    directory
  ),
  "role transition is limited to ADMIN and USER"
);

check(
  /Administrative reason is required\./.test(
    directory
  ),
  "blank administrative reason is rejected"
);

check(
  /String\(roleReason \|\| ""\)\.trim\(\)/.test(
    directory
  ),
  "administrative reason is trimmed"
);

check(
  /window\.confirm/.test(directory),
  "web mutation requires explicit confirmation"
);

check(
  /Alert\.alert/.test(directory),
  "native mutation requires explicit confirmation"
);

check(
  /roleSubmitting \|\|[\s\S]*!roleEditor/.test(
    directory
  ),
  "duplicate or invalid submission is blocked"
);

check(
  /setRoleSubmitting\(true\)/.test(directory) &&
  /setRoleSubmitting\(false\)/.test(directory),
  "submission state is controlled"
);

check(
  /await changeAdminUserRole\(\{[\s\S]*accessToken,[\s\S]*userId:[\s\S]*role:[\s\S]*reason/.test(
    directory
  ),
  "mutation sends authenticated target role and reason"
);

check(
  /await loadAdminUsers\(accessToken\)/.test(
    directory
  ),
  "directory reloads authoritative server state"
);

check(
  /roleError\?\.status === 401/.test(directory),
  "role UI handles expired authentication"
);

check(
  /roleError\?\.status === 403/.test(directory),
  "role UI handles authorization rejection"
);

check(
  /roleError\?\.message/.test(directory),
  "controlled backend business errors remain visible"
);

check(
  /testID="admin-role-control"/.test(directory),
  "role review panel has stable test identity"
);

check(
  /testID="admin-role-reason"/.test(directory),
  "reason input has stable test identity"
);

check(
  /testID="admin-role-confirm"/.test(directory),
  "confirmation control has stable test identity"
);

check(
  /testID="admin-role-cancel"/.test(directory),
  "cancel control has stable test identity"
);

check(
  /Review & Confirm Role Change/.test(directory),
  "UI explicitly separates review from mutation"
);

check(
  /controlled role and account-access administration/.test(
    directory
  ),
  "directory identifies controlled role and account-access scope"
);

check(
  /authorization role only/.test(directory),
  "UI declares role-only mutation boundary"
);

check(
  /Email, username, password and login identity[\s\S]*not editable here/.test(
    directory
  ),
  "UI declares identity fields outside mutation scope"
);

check(
  !/type=["']password["']/.test(directory),
  "directory contains no password input"
);

check(
  !/changeAdminUserEmail|updateAdminUserEmail|deleteUser|disableUser/.test(
    directory
  ),
  "directory exposes no unrelated account mutation API"
);

check(
  /export async function changeAdminUserRole/.test(
    api
  ),
  "role UI depends on canonical D2 API client"
);

check(
  /method:\s*"PATCH"/.test(api),
  "canonical role client remains PATCH based"
);

check(
  /reason:\s*administrativeReason/.test(api),
  "canonical client submits trimmed audit reason"
);

console.log("");
console.log("ASSERTIONS=" + assertions);
console.log(
  "ASSERTION_FAILURES=" + failures
);

if (failures > 0) {
  process.exitCode = 1;
}
