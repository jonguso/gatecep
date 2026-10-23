import fs from "node:fs";

const migrationPath =
  "backend/src/database/migrations/012_auth_user_roles.sql";

const source = fs.readFileSync(migrationPath, "utf8");
const assertions = [];

function check(name, condition) {
  const passed = Boolean(condition);
  assertions.push({ name, passed });
  console.log((passed ? "PASS" : "FAIL") + ": " + name);
}

check(
  "migration is transactional",
  /\bBEGIN\s*;/i.test(source) &&
    /\bCOMMIT\s*;/i.test(source)
);

check(
  "role column targets public.auth_users",
  /ALTER\s+TABLE\s+public\.auth_users[\s\S]*ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+role\s+TEXT/i.test(
    source
  )
);

check(
  "unsupported legacy roles fail closed",
  /LOWER\s*\(\s*BTRIM\s*\(\s*role\s*\)\s*\)\s+NOT\s+IN\s*\(\s*'user'\s*,\s*'admin'\s*\)/i.test(
    source
  ) &&
    /RAISE\s+EXCEPTION/i.test(source)
);

check(
  "null legacy role normalizes to USER",
  /WHEN\s+role\s+IS\s+NULL\s+THEN\s+'USER'/i.test(
    source
  )
);

check(
  "legacy user normalizes to USER",
  /LOWER\s*\(\s*BTRIM\s*\(\s*role\s*\)\s*\)\s*=\s*'user'\s+THEN\s+'USER'/i.test(
    source
  )
);

check(
  "legacy admin preserves ADMIN semantics",
  /LOWER\s*\(\s*BTRIM\s*\(\s*role\s*\)\s*\)\s*=\s*'admin'\s+THEN\s+'ADMIN'/i.test(
    source
  )
);

check(
  "future role default is USER",
  /ALTER\s+COLUMN\s+role\s+SET\s+DEFAULT\s+'USER'/i.test(
    source
  )
);

check(
  "role is non-null",
  /ALTER\s+COLUMN\s+role\s+SET\s+NOT\s+NULL/i.test(
    source
  )
);

check(
  "role constraint is explicitly named",
  /auth_users_role_check/i.test(source)
);

check(
  "canonical constraint permits only USER and ADMIN",
  /CHECK\s*\(\s*role\s+IN\s*\(\s*'USER'\s*,\s*'ADMIN'\s*\)\s*\)/i.test(
    source
  )
);

check(
  "migration has no unconditional ADMIN assignment",
  !/SET\s+role\s*=\s*'ADMIN'/i.test(source)
);

check(
  "migration does not modify password data",
  !/password_hash|passwordHash/i.test(source)
);

check(
  "migration contains no user-specific identity",
  !/@/.test(source)
);

const failures =
  assertions.filter((item) => !item.passed);

console.log("");
console.log("ASSERTIONS=" + assertions.length);
console.log("ASSERTION_FAILURES=" + failures.length);

if (failures.length > 0) {
  process.exitCode = 1;
}
