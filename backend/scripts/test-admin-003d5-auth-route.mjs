import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const route =
  readFileSync(
    "backend/src/modules/auth/auth.routes.js",
    "utf8"
  ).replace(/\r\n/g, "\n");

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
  "auth route exposes login endpoint",
  () => {
    assert.match(
      route,
      /router\.post\(\s*["']\/login["']/
    );
  }
);

check(
  "login delegates authentication to service",
  () => {
    assert.match(
      route,
      /await\s+login\(req\.body\s*\|\|\s*\{\}\)/
    );
  }
);

check(
  "successful login returns service result",
  () => {
    assert.match(
      route,
      /ok:\s*true[\s\S]*?\.\.\.result/
    );
  }
);

check(
  "typed service status must be integer",
  () => {
    assert.match(
      route,
      /Number\.isInteger\(error\.status\)/
    );
  }
);

check(
  "typed service status must be at least 400",
  () => {
    assert.match(
      route,
      /error\.status\s*>=\s*400/
    );
  }
);

check(
  "typed service status must remain below 500",
  () => {
    assert.match(
      route,
      /error\.status\s*<\s*500/
    );
  }
);

check(
  "untyped login failures default to 401",
  () => {
    assert.match(
      route,
      /\?\s*error\.status\s*:\s*401/
    );
  }
);

check(
  "login response uses resolved status",
  () => {
    assert.match(
      route,
      /res\.status\(status\)\.json/
    );
  }
);

check(
  "login response preserves service error code",
  () => {
    assert.match(
      route,
      /code:\s*error\.code\s*\|\|\s*null/
    );
  }
);

check(
  "login response preserves service detail",
  () => {
    assert.match(
      route,
      /detail:\s*error\.detail\s*\|\|\s*null/
    );
  }
);

check(
  "register response explicitly projects safe user fields",
  () => {
    assert.match(route, /id:\s*user\.id/);
    assert.match(route, /email:\s*user\.email/);
    assert.match(route, /username:\s*user\.username/);
    assert.match(route, /role:\s*user\.role/);
    assert.match(route, /createdAt:\s*user\.createdAt/);
  }
);

const registerStart =
  route.indexOf('router.post("/register"');

const loginStart =
  route.indexOf('router.post("/login"');

const registerRoute =
  registerStart >= 0 &&
  loginStart > registerStart
    ? route.slice(
        registerStart,
        loginStart
      )
    : "";

check(
  "register HTTP response never exposes password hash",
  () => {
    assert.ok(registerRoute);
    assert.doesNotMatch(
      registerRoute,
      /passwordHash|password_hash/
    );
  }
);

console.log();
console.log(`ASSERTIONS=${assertions}`);
console.log(`ASSERTION_FAILURES=${failures}`);

if (failures > 0) {
  process.exitCode = 1;
}
