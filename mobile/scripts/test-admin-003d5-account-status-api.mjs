import fs from "node:fs";

const path =
  "mobile/src/features/admin/api/adminApi.js";

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

const start =
  source.indexOf(
    "export async function changeAdminUserStatus"
  );

const end =
  source.indexOf(
    "\nexport async function ",
    start + 1
  );

const client =
  start >= 0
    ? source.slice(
        start,
        end > start ? end : source.length
      )
    : "";

check(
  Boolean(client),
  "status API client was isolated"
);

check(
  /accessToken/.test(client),
  "status client requires access token"
);

check(
  /String\(userId \|\| ""\)\.trim\(\)/.test(client),
  "target user id is normalized"
);

check(
  /\.toUpperCase\(\)/.test(client),
  "requested status is canonicalized"
);

check(
  /requestedStatus !== "ACTIVE"/.test(client),
  "ACTIVE status is supported"
);

check(
  /requestedStatus !== "DISABLED"/.test(client),
  "DISABLED status is supported"
);

check(
  /Administrative reason is required/.test(client),
  "administrative reason is required"
);

check(
  /encodeURIComponent\(\s*targetUserId\s*\)/.test(client),
  "target user id is URL encoded"
);

check(
  /\/status`/.test(client),
  "canonical status endpoint is used"
);

check(
  /method:\s*"PATCH"/.test(client),
  "status mutation uses PATCH"
);

check(
  /Authorization:\s*`Bearer \$\{accessToken\}`/.test(client),
  "Bearer authentication is supplied"
);

check(
  /"Content-Type":\s*"application\/json"/.test(client),
  "JSON content type is supplied"
);

check(
  /status:\s*requestedStatus/.test(client),
  "request body supplies canonical status"
);

check(
  /reason:\s*administrativeReason/.test(client),
  "request body supplies normalized reason"
);

check(
  /readJsonResponse\(response\)/.test(client),
  "shared JSON response parser is used"
);

check(
  /error\.status\s*=\s*response\.status/.test(client),
  "HTTP error status is preserved"
);

check(
  /error\.code\s*=\s*[\s\S]*data\.error \|\| null/.test(client),
  "server error code is preserved"
);

check(
  /return data\.user/.test(client),
  "authoritative server user is returned"
);

check(
  !/role:\s*requestedRole/.test(client),
  "status client does not mutate role"
);

check(
  !/password/i.test(client),
  "status client contains no password handling"
);

console.log("");
console.log("ASSERTIONS=" + assertions);
console.log("ASSERTION_FAILURES=" + failures);

if (failures > 0) {
  process.exitCode = 1;
}
