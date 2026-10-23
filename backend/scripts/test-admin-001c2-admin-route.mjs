import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const route =
  readFileSync(
    "backend/src/modules/admin/admin.routes.js",
    "utf8"
  );

const server =
  readFileSync(
    "backend/src/server.js",
    "utf8"
  );

const checks = [
  [
    "admin route imports authRequired",
    route.includes(
      'from "../../middleware/authRequired.js"'
    )
  ],
  [
    "admin route imports requireAdmin",
    route.includes(
      'from "../../middleware/requireRole.js"'
    )
  ],
  [
    "overview route exists",
    route.includes('"/overview"')
  ],
  [
    "authentication precedes authorization",
    /router\.get\(\s*"\/overview"\s*,\s*authRequired\s*,\s*requireAdmin\s*,/s.test(
      route
    )
  ],
  [
    "response identifies admin service",
    route.includes(
      'service: "gatecep-admin"'
    )
  ],
  [
    "response uses authenticated id",
    route.includes(
      "id: req.user.id"
    )
  ],
  [
    "response uses authorized role",
    route.includes(
      "role: req.user.role"
    )
  ],
  [
    "route contains no password handling",
    !/password|password_hash|passwordHash/i.test(
      route
    )
  ],
  [
    "route contains no environment access",
    !/process\.env|dotenv/i.test(route)
  ],
  [
    "route contains no database mutation",
    !/\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(
      route
    )
  ],
  [
    "server imports admin router",
    server.includes(
      'import adminRoutes from "./modules/admin/admin.routes.js";'
    )
  ],
  [
    "server mounts admin router",
    server.includes(
      'app.use("/admin", adminRoutes);'
    )
  ]
];

let failures = 0;

for (const [label, passed] of checks) {
  if (passed) {
    console.log(
      "PASS: " + label
    );
  } else {
    failures += 1;
    console.log(
      "FAIL: " + label
    );
  }
}

console.log("");
console.log(
  "ASSERTIONS=" + checks.length
);
console.log(
  "ASSERTION_FAILURES=" + failures
);

assert.equal(
  failures,
  0,
  "ADMIN-001C2 static contract failed"
);
