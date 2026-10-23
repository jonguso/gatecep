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
    console.log("PASS: " + message);
  } else {
    failures += 1;
    console.log("FAIL: " + message);
  }
}

check(
  /changeAdminUserStatus/.test(source),
  "admin route imports controlled status service"
);

check(
  /"\/users\/:userId\/status"/.test(source),
  "canonical admin status route exists"
);

const routeStart =
  source.indexOf(
    'router.patch(\n  "/users/:userId/status"'
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
    ? source.slice(routeStart, routeEnd)
    : "";

check(
  Boolean(route),
  "status route source was isolated"
);

check(
  route.indexOf("authRequired") >= 0,
  "status route requires authentication"
);

check(
  route.indexOf("requireAdmin") >= 0,
  "status route requires persisted ADMIN authorization"
);

check(
  route.indexOf("authRequired") <
    route.indexOf("requireAdmin"),
  "authentication precedes authorization"
);

check(
  /actorUserId:\s*req\.user\.id/.test(route),
  "actor identity comes from authenticated request"
);

check(
  !/actorUserId:\s*req\.body/.test(route),
  "client cannot supply audit actor"
);

check(
  /targetUserId:\s*req\.params\.userId/.test(route),
  "target identity comes from route parameter"
);

check(
  /status:\s*req\.body\?\.status/.test(route),
  "request body supplies requested status"
);

check(
  /reason:\s*req\.body\?\.reason/.test(route),
  "request body supplies administrative reason"
);

check(
  /await changeAdminUserStatus/.test(route),
  "route delegates to controlled status service"
);

check(
  /Number\.isInteger\(error\?\.status\)/.test(route) &&
    /error\.status >= 400/.test(route) &&
    /error\.status < 500/.test(route),
  "typed 4xx service errors are recognized"
);

check(
  /\.status\(error\.status\)/.test(route),
  "typed 4xx service status is preserved"
);

check(
  /error\.code\s*\|\|\s*"ACCOUNT_STATUS_CHANGE_REJECTED"/.test(route),
  "typed 4xx service code is preserved"
);

check(
  /message:\s*error\.message/.test(route),
  "typed 4xx service message is preserved"
);

check(
  /return next\(error\)/.test(route),
  "unexpected service errors still flow to error middleware"
);

check(
  !/UPDATE public\.auth_users/.test(route),
  "HTTP route contains no direct status SQL"
);

check(
  !/appendAdminAuditEvent/.test(route),
  "HTTP route cannot independently write audit events"
);

check(
  !/password/i.test(route),
  "status endpoint contains no password handling"
);

check(
  !/requestedRole|req\.body\?\.role/.test(route),
  "status endpoint cannot mutate role"
);

check(
  !/email\s*=/.test(route),
  "status endpoint cannot mutate email identity"
);

console.log("");
console.log("ASSERTIONS=" + assertions);
console.log("ASSERTION_FAILURES=" + failures);

if (failures > 0) {
  process.exitCode = 1;
}
