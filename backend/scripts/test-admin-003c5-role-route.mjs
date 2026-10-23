import fs from "node:fs";

const path =
  "backend/src/modules/admin/admin.routes.js";

const source =
  fs.readFileSync(path, "utf8")
    .replace(/\r\n/g, "\n");

let assertions = 0;
let failures = 0;

function check(condition, message) {
  assertions += 1;

  if (condition) {
    console.log(
      "PASS: " + message
    );
  } else {
    failures += 1;

    console.log(
      "FAIL: " + message
    );
  }
}

check(
  /changeUserRole/.test(source),
  "admin route imports controlled role service"
);

check(
  /router\.patch\(/.test(source),
  "admin role mutation uses PATCH"
);

check(
  /"\/users\/:userId\/role"/.test(
    source
  ),
  "canonical admin role route exists"
);

const routeStart =
  source.indexOf(
    'router.patch(\n  "/users/:userId/role"'
  );

const nextRouter =
  routeStart >= 0
    ? source.indexOf(
        "\nrouter.",
        routeStart + 1
      )
    : -1;

const exportStart =
  routeStart >= 0
    ? source.indexOf(
        "\nexport default router;",
        routeStart + 1
      )
    : -1;

const routeEnd =
  nextRouter > routeStart
    ? nextRouter
    : exportStart;

const route =
  routeStart >= 0 &&
  routeEnd > routeStart
    ? source.slice(
        routeStart,
        routeEnd
      )
    : "";

check(
  Boolean(route),
  "role route source was isolated"
);

check(
  route.indexOf("authRequired") >= 0,
  "role route requires authentication"
);

check(
  route.indexOf("requireAdmin") >= 0,
  "role route requires persisted ADMIN authorization"
);

check(
  route.indexOf("authRequired") <
    route.indexOf("requireAdmin"),
  "authentication precedes authorization"
);

check(
  /actorUserId:\s*req\.user\.id/.test(
    route
  ),
  "actor identity comes from authenticated request"
);

check(
  !/actorUserId:\s*req\.body/.test(
    route
  ),
  "client cannot supply audit actor"
);

check(
  /targetUserId:\s*req\.params\.userId/.test(
    route
  ),
  "target identity comes from route parameter"
);

check(
  /requestedRole:\s*req\.body\?\.role/.test(
    route
  ),
  "request body supplies requested role"
);

check(
  /reason:\s*req\.body\?\.reason/.test(
    route
  ),
  "request body supplies administrative reason"
);

check(
  /await changeUserRole/.test(route),
  "route delegates mutation to controlled service"
);

check(
  /error\?\.status/.test(route),
  "controlled service status is handled"
);

check(
  /error\.code/.test(route),
  "controlled service error code is returned"
);

check(
  /return next\(error\)/.test(route),
  "unexpected errors flow to error middleware"
);

check(
  !/UPDATE public\.auth_users/.test(route),
  "HTTP route contains no direct role SQL"
);

check(
  !/appendAdminAuditEvent/.test(route),
  "HTTP route cannot independently write audit events"
);

check(
  !/password/i.test(route),
  "role endpoint contains no password handling"
);

check(
  !/email\s*=/.test(route),
  "role endpoint cannot mutate email login identity"
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
