import fs from "node:fs";

const path =
  "backend/src/modules/admin/admin.routes.js";

const source =
  fs.readFileSync(
    path,
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

check(
  /listAdminAuditEvents/.test(source),
  "admin route imports canonical audit reader"
);

check(
  /router\.get\(\s*["']\/audit-events["']/.test(
    source
  ),
  "canonical admin audit read route exists"
);

const start =
  source.indexOf(
    'router.get(\n  "/audit-events"'
  );

const nextRouter =
  start >= 0
    ? source.indexOf(
        "\nrouter.",
        start + 1
      )
    : -1;

const exportStart =
  start >= 0
    ? source.indexOf(
        "\nexport default router;",
        start + 1
      )
    : -1;

const end =
  nextRouter > start
    ? nextRouter
    : exportStart;

const route =
  start >= 0 &&
  end > start
    ? source.slice(
        start,
        end
      )
    : "";

check(
  route.length > 0,
  "audit route source was isolated"
);

check(
  /authRequired/.test(route),
  "audit route requires authentication"
);

check(
  /requireAdmin/.test(route),
  "audit route requires ADMIN authorization"
);

check(
  route.indexOf("authRequired") >= 0 &&
  route.indexOf("requireAdmin") >
    route.indexOf("authRequired"),
  "authentication precedes authorization"
);

check(
  /req\.query\?\.limit/.test(route),
  "audit route accepts optional limit"
);

check(
  /Number\.parseInt/.test(route),
  "audit limit is parsed as integer"
);

check(
  /:\s*100/.test(route),
  "audit route defaults history limit to 100"
);

check(
  /listAdminAuditEvents\s*\(\s*\{[\s\S]*limit/.test(
    route
  ),
  "audit route delegates to canonical repository"
);

check(
  /events/.test(route),
  "audit route returns event collection"
);

check(
  /ok:\s*true/.test(route),
  "successful audit response is explicit"
);

check(
  /next\(error\)/.test(route),
  "unexpected audit errors flow to middleware"
);

check(
  !/SELECT\s+/i.test(route),
  "HTTP audit route contains no direct SELECT"
);

check(
  !/INSERT\s+/i.test(route),
  "HTTP audit route contains no audit mutation"
);

check(
  !/UPDATE\s+/i.test(route),
  "HTTP audit route contains no audit update"
);

check(
  !/DELETE\s+/i.test(route),
  "HTTP audit route contains no audit delete"
);

check(
  !/password|accessToken|refreshToken|authorization/i.test(
    route.replace(
      /authRequired/g,
      ""
    )
  ),
  "audit response route introduces no secret fields"
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
