import fs from "node:fs";

const api =
  fs.readFileSync(
    "mobile/src/features/admin/api/adminApi.js",
    "utf8"
  );

const consoleScreen =
  fs.readFileSync(
    "mobile/app/admin.js",
    "utf8"
  );

const directory =
  fs.readFileSync(
    "mobile/app/admin-users.js",
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
  /export async function loadAdminUsers/.test(api),
  "admin API exports directory loader"
);

check(
  /\/admin\/users/.test(api),
  "directory loader targets protected admin users endpoint"
);

check(
  /Authorization:\s*`Bearer\s+\$\{accessToken\}`/.test(api),
  "directory loader sends Bearer token"
);

check(
  /loadAdminUsers/.test(directory),
  "directory screen uses admin directory API"
);

check(
  /useAuth/.test(directory) &&
  /accessToken/.test(directory),
  "directory derives authenticated access token"
);

check(
  /status === 401/.test(directory),
  "directory handles authentication failure"
);

check(
  /status === 403/.test(directory),
  "directory handles authorization failure"
);

check(
  /Server-authorized GateCEP account directory/.test(
    directory
  ) &&
  /controlled role and account-access administration/.test(
    directory
  ),
  "directory identifies server-authorized controlled administration scope"
);

check(
  /entry\.username/.test(directory),
  "directory renders username"
);

check(
  /entry\.email/.test(directory),
  "directory renders email"
);

check(
  /entry\.role/.test(directory),
  "directory renders authorization role"
);

check(
  /entry\.createdAt/.test(directory),
  "directory renders created timestamp"
);

check(
  /entry\.updatedAt/.test(directory),
  "directory renders updated timestamp"
);

check(
  !/type=["']password["']/.test(directory) &&
  /password and login identity[\s\S]*not editable here/.test(
    directory
  ),
  "directory contains no password input and declares password outside role scope"
);

check(
  !/UPDATE|DELETE|INSERT/.test(directory),
  "directory contains no mutation language"
);

check(
  /title:\s*"Access & Security"/.test(
    consoleScreen
  ),
  "Operations Console contains Access & Security"
);

check(
  /route:\s*"\/admin-users"/.test(
    consoleScreen
  ),
  "Access & Security opens admin user directory"
);

check(
  /changeAdminUserRole/.test(directory) &&
  !/deleteUser|disableUser|changeAdminUserEmail|updateAdminUserEmail/.test(
    directory
  ),
  "directory exposes controlled role mutation only"
);

console.log("");
console.log("ASSERTIONS=" + assertions);
console.log("ASSERTION_FAILURES=" + failures);

if (failures > 0) {
  process.exitCode = 1;
}
