import fs from "node:fs";

const files = {
  menu:
    "mobile/app/menu.js",
  screen:
    "mobile/app/admin.js",
  api:
    "mobile/src/features/admin/api/adminApi.js"
};

const menu =
  fs.readFileSync(files.menu, "utf8");

const screen =
  fs.readFileSync(files.screen, "utf8");

const api =
  fs.readFileSync(files.api, "utf8");

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
  /const\s+isAdmin\s*=/.test(menu),
  "menu derives admin visibility"
);

check(
  /user\?\.role/.test(menu),
  "menu visibility derives from authenticated user role"
);

check(
  /\.toUpperCase\(\)\s*===\s*["']ADMIN["']/.test(menu),
  "menu canonicalizes ADMIN role"
);

check(
  /const\s+visibleSections\s*=\s*isAdmin/.test(menu),
  "menu sections are conditional on admin visibility"
);

check(
  /title:\s*["']Operations Console["']/.test(menu),
  "menu defines Operations Console entry"
);

check(
  /route:\s*["']\/admin["']/.test(menu),
  "Operations Console routes to /admin"
);

check(
  /visibleSections\.map/.test(menu),
  "menu renders filtered visible sections"
);

check(
  /loadAdminOverview\(accessToken\)/.test(screen),
  "console verifies access through admin API"
);

check(
  /result\?\.admin\s*===\s*true/.test(screen),
  "console requires backend admin marker"
);

check(
  /result\?\.user\?\.role/.test(screen),
  "console checks backend-authorized role"
);

check(
  /\.toUpperCase\(\)\s*===\s*["']ADMIN["']/.test(screen),
  "console requires backend ADMIN role"
);

check(
  /if\s*\(!authorized\)/.test(screen),
  "console has explicit unauthorized state"
);

check(
  /accessError\?\.status\s*===\s*401/.test(screen),
  "console handles authentication failure"
);

check(
  /accessError\?\.status\s*===\s*403/.test(screen),
  "console handles authorization failure"
);

check(
  /Authorization:\s*`Bearer\s+\$\{accessToken\}`/.test(api),
  "admin API sends Bearer access token"
);

check(
  /`\$\{API_URL\}\/admin\/overview`/.test(api),
  "admin API targets protected overview endpoint"
);

check(
  !/password/i.test(api),
  "admin API contains no password handling"
);

check(
  !/password/i.test(screen),
  "console contains no password handling"
);

check(
  !/scheduler\/(start|stop)/i.test(screen),
  "console exposes no scheduler mutation"
);

check(
  !/market-cache\/refresh/i.test(screen),
  "console exposes no market refresh mutation"
);

console.log("");
console.log(
  "ASSERTIONS=" + assertions
);

console.log(
  "ASSERTION_FAILURES=" + failures
);

if (failures > 0) {
  process.exitCode = 1;
}
