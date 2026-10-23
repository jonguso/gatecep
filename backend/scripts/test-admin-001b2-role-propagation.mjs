import fs from "node:fs";

const repository = fs.readFileSync(
  "backend/src/modules/users/users.repository.js",
  "utf8"
);

const auth = fs.readFileSync(
  "backend/src/modules/auth/auth.service.js",
  "utf8"
);

const middleware = fs.readFileSync(
  "backend/src/middleware/authRequired.js",
  "utf8"
);

const authRoutes = fs.readFileSync(
  "backend/src/modules/auth/auth.routes.js",
  "utf8"
);

const usersRoutes = fs.readFileSync(
  "backend/src/modules/users/users.routes.js",
  "utf8"
);

const assertions = [];

function check(name, condition) {
  const passed = Boolean(condition);
  assertions.push({ name, passed });

  console.log(
    (passed ? "PASS" : "FAIL") +
      ": " +
      name
  );
}

const insertMatch = repository.match(
  /INSERT\s+INTO\s+public\.auth_users\s*\(([\s\S]*?)\)\s*VALUES/i
);

check(
  "createUser INSERT exists",
  Boolean(insertMatch)
);

check(
  "createUser INSERT does not accept role",
  Boolean(insertMatch) &&
    !/\brole\b/i.test(insertMatch[1])
);

const roleProjectionCount =
  (repository.match(/^\s*role,\s*$/gm) || []).length;

check(
  "repository projects persisted role in canonical reads",
  roleProjectionCount >= 3
);

check(
  "registration does not consume payload.role",
  !/payload\.role/.test(auth) &&
    !/payload\.role/.test(authRoutes)
);

const createUserCall = auth.match(
  /createUser\s*\(\s*\{([\s\S]*?)\}\s*\)/
);

check(
  "registration does not pass role to createUser",
  Boolean(createUserCall) &&
    !/\brole\s*:/.test(createUserCall[1])
);

check(
  "JWT carries repository-derived role",
  /role:\s*user\.role/.test(auth)
);

check(
  "login response carries repository-derived role",
  (auth.match(/role:\s*user\.role/g) || []).length === 2
);

check(
  "register response carries persisted role",
  /role:\s*user\.role/.test(authRoutes)
);

check(
  "authRequired resolves authorization role from persisted user",
  /await\s+findUserById\s*\(\s*userId\s*\)/.test(
    middleware
  ) &&
    /role:\s*[\s\S]*?user\.role/.test(
      middleware
    ) &&
    !/role:\s*payload\.role/.test(
      middleware
    )
);

check(
  "users me endpoint remains authenticated",
  /router\.get\s*\(\s*["']\/me["']\s*,\s*authRequired/.test(
    usersRoutes
  )
);

check(
  "users me returns req.user",
  /user:\s*req\.user/.test(usersRoutes)
);

check(
  "no ADMIN literal introduced into propagation files",
  !/\bADMIN\b/.test(repository) &&
    !/\bADMIN\b/.test(auth) &&
    !/\bADMIN\b/.test(middleware) &&
    !/\bADMIN\b/.test(authRoutes)
);

const jwtBlock = auth.match(
  /jwt\.sign\s*\(\s*\{([\s\S]*?)\}\s*,/
);

check(
  "JWT does not contain password hash",
  Boolean(jwtBlock) &&
    !/passwordHash|password_hash/.test(jwtBlock[1])
);

check(
  "JWT role originates from persisted user",
  Boolean(jwtBlock) &&
    /role:\s*user\.role/.test(jwtBlock[1])
);

const failures =
  assertions.filter((item) => !item.passed);

console.log("");
console.log(
  "ASSERTIONS=" + assertions.length
);
console.log(
  "ASSERTION_FAILURES=" + failures.length
);

if (failures.length > 0) {
  process.exitCode = 1;
}
