import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const path =
  "mobile/src/features/admin/api/adminApi.js";

const source =
  readFileSync(path, "utf8");

let passed = 0;

function check(label, fn) {
  try {
    fn();
    passed += 1;
    console.log("PASS:", label);
  } catch (error) {
    console.log("FAIL:", label);
    throw error;
  }
}

const targetsStart =
  source.indexOf(
    "export async function loadAdminReconciliationTargets"
  );

const brokersStart =
  source.indexOf(
    "export async function loadAdminTargetBrokerLinks"
  );

const previewStart =
  source.indexOf(
    "export async function previewAdminReconciliationEvidence"
  );

const auditStart =
  source.indexOf(
    "export async function loadAdminAuditEvents"
  );

check(
  "target loader exists",
  () =>
    assert.ok(targetsStart >= 0)
);

check(
  "broker loader exists",
  () =>
    assert.ok(brokersStart >= 0)
);

check(
  "target loader precedes broker loader",
  () =>
    assert.ok(
      brokersStart > targetsStart
    )
);

check(
  "broker loader precedes evidence preview",
  () =>
    assert.ok(
      previewStart > brokersStart
    )
);

check(
  "evidence preview precedes audit loader",
  () =>
    assert.ok(
      auditStart > previewStart
    )
);

const targetBlock =
  source.slice(
    targetsStart,
    brokersStart
  );

const brokerBlock =
  source.slice(
    brokersStart,
    previewStart
  );

check(
  "target loader requires access token",
  () =>
    assert.match(
      targetBlock,
      /if\s*\(\s*!accessToken\s*\)/
    )
);

check(
  "target loader calls canonical admin route",
  () =>
    assert.match(
      targetBlock,
      /\/admin\/reconciliation-targets/
    )
);

check(
  "target loader sends bearer token",
  () =>
    assert.match(
      targetBlock,
      /Authorization\s*:\s*`Bearer \$\{accessToken\}`/
    )
);

check(
  "target loader parses canonical response",
  () =>
    assert.match(
      targetBlock,
      /readJsonResponse\(response\)/
    )
);

check(
  "target loader preserves HTTP status",
  () =>
    assert.match(
      targetBlock,
      /error\.status\s*=\s*response\.status/
    )
);

check(
  "target loader preserves server error code",
  () =>
    assert.match(
      targetBlock,
      /error\.code\s*=\s*data\.error\s*\|\|\s*null/
    )
);

check(
  "target loader returns target array",
  () =>
    assert.match(
      targetBlock,
      /Array\.isArray\(data\.targets\)/
    )
);

check(
  "broker loader requires access token",
  () =>
    assert.match(
      brokerBlock,
      /if\s*\(\s*!accessToken\s*\)/
    )
);

check(
  "broker loader requires explicit target id",
  () =>
    assert.match(
      brokerBlock,
      /String\(targetUserId\s*\|\|\s*""\)\.trim\(\)/
    )
);

check(
  "broker loader rejects missing target",
  () =>
    assert.match(
      brokerBlock,
      /Reconciliation target user is required\./
    )
);

check(
  "broker loader encodes explicit target id",
  () =>
    assert.match(
      brokerBlock,
      /encodeURIComponent\(\s*normalizedTargetUserId\s*\)/
    )
);

check(
  "broker loader calls target broker route",
  () =>
    assert.match(
      brokerBlock,
      /\/broker-links/
    )
);

check(
  "broker loader sends bearer token",
  () =>
    assert.match(
      brokerBlock,
      /Authorization\s*:\s*`Bearer \$\{accessToken\}`/
    )
);

check(
  "broker loader preserves HTTP status",
  () =>
    assert.match(
      brokerBlock,
      /error\.status\s*=\s*response\.status/
    )
);

check(
  "broker loader preserves server error code",
  () =>
    assert.match(
      brokerBlock,
      /error\.code\s*=\s*data\.error\s*\|\|\s*null/
    )
);

check(
  "broker loader returns server target",
  () =>
    assert.match(
      brokerBlock,
      /target\s*:\s*data\.target\s*\|\|\s*null/
    )
);

check(
  "broker loader normalizes broker array",
  () =>
    assert.match(
      brokerBlock,
      /Array\.isArray\(data\.brokers\)/
    )
);

check(
  "broker loader does not use authenticated user as target",
  () => {
    assert.doesNotMatch(
      brokerBlock,
      /req\.user|user\.id|accessToken\.user/
    );
  }
);

check(
  "API does not mutate portfolio",
  () => {
    assert.doesNotMatch(
      targetBlock + brokerBlock,
      /replaceAuthoritative|authoritative-snapshot|method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/
    );
  }
);

check(
  "API does not use local broker storage",
  () => {
    assert.doesNotMatch(
      targetBlock + brokerBlock,
      /userGetItem|AsyncStorage|brokerAccounts/
    );
  }
);

console.log(
  `ADMIN_003D6_R7C_PASS=${passed}/25`
);
