import fs from "node:fs";

const repository =
  fs.readFileSync(
    "backend/src/modules/users/users.repository.js",
    "utf8"
  );

const routes =
  fs.readFileSync(
    "backend/src/modules/admin/admin.routes.js",
    "utf8"
  ).replace(/\r\n/g, "\n");

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

const listStart =
  repository.indexOf(
    "export async function listUsersForAdmin"
  );

const listSource =
  listStart >= 0
    ? repository.slice(listStart)
    : "";

check(
  listStart >= 0,
  "repository exports admin user directory query"
);

check(
  /FROM\s+public\.auth_users/i.test(listSource),
  "directory reads canonical auth_users table"
);

check(
  /\bid\b/.test(listSource),
  "directory selects user id"
);

check(
  /\bemail\b/.test(listSource),
  "directory selects email"
);

check(
  /\busername\b/.test(listSource),
  "directory selects username"
);

check(
  /\brole\b/.test(listSource),
  "directory selects role"
);

check(
  /created_at\s+AS\s+"createdAt"/i.test(listSource),
  "directory selects created timestamp"
);

check(
  /updated_at\s+AS\s+"updatedAt"/i.test(listSource),
  "directory selects updated timestamp"
);

check(
  !/password_hash/i.test(listSource),
  "directory never selects password hash"
);

check(
  !/\bUPDATE\b/i.test(listSource),
  "directory performs no update"
);

check(
  !/\bDELETE\b/i.test(listSource),
  "directory performs no delete"
);

check(
  !/\bINSERT\b/i.test(listSource),
  "directory performs no insert"
);

check(
  /listUsersForAdmin/.test(routes),
  "admin route imports directory repository"
);

check(
  /router\.get\(\s*["']\/users["']/.test(routes),
  "admin GET /users route exists"
);

const usersRouteStart =
  routes.indexOf('router.get(\n  "/users"');

const usersNextRouter =
  usersRouteStart >= 0
    ? routes.indexOf(
        "\nrouter.",
        usersRouteStart + 1
      )
    : -1;

const usersExportStart =
  usersRouteStart >= 0
    ? routes.indexOf(
        "\nexport default router;",
        usersRouteStart + 1
      )
    : -1;

const usersRouteEnd =
  usersNextRouter > usersRouteStart
    ? usersNextRouter
    : usersExportStart;

const usersRouteSource =
  usersRouteStart >= 0 &&
  usersRouteEnd > usersRouteStart
    ? routes.slice(
        usersRouteStart,
        usersRouteEnd
      )
    : "";

check(
  usersRouteStart >= 0,
  "admin users route source found"
);

check(
  usersRouteSource.indexOf("authRequired") >= 0 &&
  usersRouteSource.indexOf("requireAdmin") >= 0 &&
  usersRouteSource.indexOf("authRequired") <
    usersRouteSource.indexOf("requireAdmin"),
  "authentication precedes admin authorization"
);

check(
  /await\s+listUsersForAdmin\(\)/.test(
    usersRouteSource
  ),
  "route loads safe directory query"
);

check(
  /ok:\s*true/.test(usersRouteSource) &&
  /\busers\b/.test(usersRouteSource),
  "route returns user directory"
);

check(
  !/password/i.test(usersRouteSource),
  "admin directory route contains no password handling"
);

check(
  !/req\.body/.test(usersRouteSource),
  "read-only route does not consume request body"
);

console.log("");
console.log("ASSERTIONS=" + assertions);
console.log("ASSERTION_FAILURES=" + failures);

if (failures > 0) {
  process.exitCode = 1;
}
