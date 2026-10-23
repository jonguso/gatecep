import fs from "node:fs";

const path =
  "mobile/src/features/admin/api/adminApi.js";

const source =
  fs.readFileSync(path, "utf8");

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

const marker =
  "export async function loadAdminAuditEvents";

const start =
  source.indexOf(marker);

const client =
  start >= 0
    ? source.slice(start)
    : "";

check(
  start >= 0,
  "admin API exports audit history loader"
);

check(
  client.length > 0,
  "audit API client source was isolated"
);

check(
  /if\s*\(\s*!accessToken\s*\)/.test(
    client
  ),
  "audit loader requires access token"
);

check(
  /Authentication is required/.test(
    client
  ),
  "missing authentication is explicit"
);

check(
  /limit\s*=\s*100/.test(client),
  "audit loader defaults limit to 100"
);

check(
  /Number\.parseInt/.test(client),
  "audit loader normalizes requested limit"
);

check(
  /\/admin\/audit-events\?limit=/.test(
    client
  ),
  "audit loader targets canonical endpoint"
);

check(
  /encodeURIComponent/.test(client),
  "audit limit is URL encoded"
);

check(
  /Authorization:[\s\S]*Bearer/.test(
    client
  ),
  "audit loader sends Bearer token"
);

check(
  /readJsonResponse\(response\)/.test(
    client
  ),
  "audit loader uses shared response parser"
);

check(
  /!response\.ok\s*\|\|\s*!data\.ok/.test(
    client
  ),
  "audit loader rejects unsuccessful responses"
);

check(
  /error\.status\s*=\s*response\.status/.test(
    client
  ),
  "HTTP status is preserved for UI handling"
);

check(
  /error\.code\s*=/.test(client),
  "backend error code is preserved"
);

check(
  /Array\.isArray\(data\.events\)/.test(
    client
  ),
  "successful loader validates event collection"
);

check(
  /\?\s*data\.events\s*:\s*\[\]/.test(
    client
  ),
  "invalid event collection safely becomes empty"
);

check(
  !/method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i.test(
    client
  ),
  "audit client performs no mutation request"
);

check(
  !/password/i.test(client),
  "audit client contains no password handling"
);

check(
  !/refreshToken|refresh_token/i.test(
    client
  ),
  "audit client contains no refresh-token handling"
);

check(
  !/beforeState\s*=|afterState\s*=|reason\s*=/i.test(
    client
  ),
  "audit client does not rewrite persisted audit evidence"
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
