import fs from "node:fs";

const api =
  fs.readFileSync(
    "mobile/src/features/admin/api/adminApi.js",
    "utf8"
  );

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

const start =
  api.indexOf(
    "export async function changeAdminUserRole"
  );

const end =
  api.indexOf(
    "export async function loadAdminUsers",
    start
  );

const source =
  start >= 0 &&
  end > start
    ? api.slice(start, end)
    : "";

check(
  start >= 0,
  "admin API exports controlled role mutation"
);

check(
  source.length > 0,
  "role mutation API source isolated"
);

check(
  /accessToken/.test(source),
  "role mutation requires access token"
);

check(
  /userId/.test(source),
  "role mutation requires target user identity"
);

check(
  /role/.test(source),
  "role mutation accepts requested role"
);

check(
  /reason/.test(source),
  "role mutation accepts administrative reason"
);

check(
  /USER/.test(source) &&
  /ADMIN/.test(source),
  "client restricts role vocabulary"
);

check(
  /Administrative reason is required/.test(
    source
  ),
  "client requires administrative reason"
);

check(
  /\/admin\/users\//.test(source) &&
  /\/role/.test(source),
  "client targets canonical role endpoint"
);

check(
  /encodeURIComponent/.test(source),
  "target user identity is URL encoded"
);

check(
  /method:\s*"PATCH"/.test(source),
  "role mutation uses PATCH"
);

check(
  /Content-Type["']?\s*:\s*"application\/json"/.test(
    source
  ),
  "role mutation sends JSON content type"
);

check(
  /Authorization:\s*`Bearer\s+\$\{accessToken\}`/.test(
    source
  ),
  "role mutation sends Bearer token"
);

check(
  /JSON\.stringify/.test(source),
  "role mutation serializes request body"
);

check(
  /role:\s*requestedRole/.test(source),
  "request body sends canonical requested role"
);

check(
  /reason:\s*administrativeReason/.test(
    source
  ),
  "request body sends trimmed reason"
);

check(
  /readJsonResponse/.test(source),
  "role mutation uses shared response parser"
);

check(
  /error\.status\s*=\s*response\.status/.test(
    source
  ),
  "HTTP status is preserved for UI handling"
);

check(
  /error\.code/.test(source),
  "backend role error code is preserved"
);

check(
  /return data\.user/.test(source),
  "successful mutation returns server user"
);

check(
  !/password/i.test(source),
  "role client contains no password handling"
);

check(
  !/email\s*:/.test(source),
  "role client cannot mutate email login identity"
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
