import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  "backend/src/middleware/requireRole.js";

const source =
  fs.readFileSync(path, "utf8");

const assertions = [];

function check(name, fn) {
  try {
    fn();
    assertions.push({
      name,
      passed: true
    });
    console.log(
      "PASS: " + name
    );
  } catch (error) {
    assertions.push({
      name,
      passed: false
    });
    console.log(
      "FAIL: " +
        name +
        " — " +
        error.message
    );
  }
}

check(
  "guard imports findUserById",
  () => {
    assert.match(
      source,
      /findUserById/
    );
  }
);

check(
  "guard exports generic requireRole",
  () => {
    assert.match(
      source,
      /export\s+function\s+requireRole/
    );
  }
);

check(
  "guard exports requireAdmin",
  () => {
    assert.match(
      source,
      /export\s+const\s+requireAdmin\s*=\s*requireRole\s*\(\s*["']ADMIN["']\s*\)/
    );
  }
);

check(
  "guard requires authenticated identity",
  () => {
    assert.match(
      source,
      /req\.user\?\.\s*id/
    );
  }
);

check(
  "authorization reloads user from database",
  () => {
    assert.match(
      source,
      /await\s+findUserById\s*\(\s*userId\s*\)/
    );
  }
);

check(
  "authorization decision uses persisted user role",
  () => {
    assert.match(
      source,
      /String\s*\(\s*user\.role/
    );

    assert.match(
      source,
      /canonicalRoles\.has\s*\(\s*currentRole\s*\)/
    );
  }
);

check(
  "authorization decision does not use JWT role",
  () => {
    assert.doesNotMatch(
      source,
      /canonicalRoles\.has\s*\(\s*req\.user\.role\s*\)/
    );
  }
);

check(
  "missing authenticated identity returns 401",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!userId\s*\)[\s\S]*?status\s*\(\s*401\s*\)/
    );
  }
);

check(
  "missing persisted user returns 401",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!user\s*\)[\s\S]*?status\s*\(\s*401\s*\)/
    );
  }
);

check(
  "insufficient role returns 403",
  () => {
    assert.match(
      source,
      /!canonicalRoles\.has\s*\(\s*currentRole\s*\)[\s\S]*?status\s*\(\s*403\s*\)/
    );
  }
);

check(
  "authorized persisted role refreshes request role",
  () => {
    assert.match(
      source,
      /role:\s*currentRole/
    );
  }
);

check(
  "authorized request calls next",
  () => {
    assert.match(
      source,
      /return\s+next\s*\(\s*\)/
    );
  }
);

check(
  "database errors flow to error middleware",
  () => {
    assert.match(
      source,
      /catch\s*\([^)]*\)[\s\S]*?return\s+next\s*\(\s*error\s*\)/
    );
  }
);

check(
  "guard does not read request body role",
  () => {
    assert.doesNotMatch(
      source,
      /req\.body/
    );
  }
);

check(
  "guard does not mutate database",
  () => {
    assert.doesNotMatch(
      source,
      /\b(INSERT|UPDATE|DELETE)\b/i
    );
  }
);

const failures =
  assertions.filter(
    (item) => !item.passed
  );

console.log("");
console.log(
  "ASSERTIONS=" +
    assertions.length
);

console.log(
  "ASSERTION_FAILURES=" +
    failures.length
);

if (failures.length > 0) {
  process.exitCode = 1;
}
