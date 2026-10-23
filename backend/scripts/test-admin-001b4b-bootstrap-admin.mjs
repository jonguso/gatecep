import assert from "node:assert/strict";
import fs from "node:fs";

const source =
  fs.readFileSync(
    "backend/scripts/bootstrap-admin.mjs",
    "utf8"
  );

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
  "bootstrap requires explicit email",
  () => {
    assert.match(
      source,
      /--email/
    );
  }
);

check(
  "bootstrap does not select first user",
  () => {
    assert.doesNotMatch(
      source,
      /ORDER\s+BY[\s\S]*LIMIT\s+1/i
    );
  }
);

check(
  "bootstrap matches canonical email",
  () => {
    assert.match(
      source,
      /WHERE\s+LOWER\s*\(\s*email\s*\)\s*=\s*LOWER\s*\(\s*\$1\s*\)/i
    );
  }
);

check(
  "bootstrap requires exactly one account",
  () => {
    assert.match(
      source,
      /result\.rows\.length\s*!==\s*1/
    );
  }
);

check(
  "bootstrap defaults to dry run",
  () => {
    assert.match(
      source,
      /apply:\s*false/
    );
  }
);

check(
  "bootstrap requires explicit apply flag",
  () => {
    assert.match(
      source,
      /value\s*===\s*["']--apply["']/
    );
  }
);

check(
  "bootstrap starts transaction",
  () => {
    assert.match(
      source,
      /client\.query\s*\(\s*["']BEGIN["']\s*\)/
    );
  }
);

check(
  "dry run rolls back",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!args\.apply\s*\)[\s\S]*?ROLLBACK/
    );
  }
);

check(
  "apply changes USER to ADMIN only",
  () => {
    assert.match(
      source,
      /SET[\s\S]*role\s*=\s*'ADMIN'[\s\S]*WHERE[\s\S]*id\s*=\s*\$1[\s\S]*role\s*=\s*'USER'/i
    );
  }
);

check(
  "apply verifies exactly one update",
  () => {
    assert.match(
      source,
      /update\.rows\.length\s*!==\s*1/
    );
  }
);

check(
  "apply commits explicitly",
  () => {
    assert.match(
      source,
      /client\.query\s*\(\s*["']COMMIT["']\s*\)/
    );
  }
);

check(
  "bootstrap does not accept username selector",
  () => {
    assert.doesNotMatch(
      source,
      /--username/
    );
  }
);

check(
  "bootstrap does not handle passwords",
  () => {
    assert.doesNotMatch(
      source,
      /password/i
    );
  }
);

check(
  "bootstrap masks displayed email",
  () => {
    assert.match(
      source,
      /maskEmail/
    );
  }
);

check(
  "bootstrap contains no hardcoded email",
  () => {
    assert.doesNotMatch(
      source,
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );
  }
);

check(
  "bootstrap rejects already ADMIN target",
  () => {
    assert.match(
      source,
      /user\.role\s*===\s*["']ADMIN["']/
    );
  }
);

check(
  "bootstrap rejects noncanonical source role",
  () => {
    assert.match(
      source,
      /user\.role\s*!==\s*["']USER["']/
    );
  }
);

const failures =
  assertions.filter(
    (item) =>
      !item.passed
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
