import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const path =
  new URL(
    "../src/modules/admin/admin.routes.js",
    import.meta.url
  );

const source =
  readFileSync(path, "utf8");

let passed = 0;

function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log("PASS:", name);
}

check(
  "imports target listing service",
  source.includes(
    "listAdminReconciliationTargets"
  )
);

check(
  "imports target broker service",
  source.includes(
    "getAdminTargetBrokerLinks"
  )
);

const listRouteStart =
  source.indexOf(
    '"/reconciliation-targets"'
  );

const brokerRouteStart =
  source.indexOf(
    '"/reconciliation-targets/:userId/broker-links"'
  );

const auditRouteStart =
  source.indexOf(
    '"/audit-events"'
  );

check(
  "target listing route exists",
  listRouteStart >= 0
);

check(
  "target broker route exists",
  brokerRouteStart > listRouteStart
);

check(
  "routes precede audit route",
  auditRouteStart > brokerRouteStart
);

const listRoute =
  source.slice(
    listRouteStart,
    brokerRouteStart
  );

const brokerRoute =
  source.slice(
    brokerRouteStart,
    auditRouteStart
  );

check(
  "target listing requires authentication",
  listRoute.includes("authRequired")
);

check(
  "target listing requires ADMIN",
  listRoute.includes("requireAdmin")
);

check(
  "target listing calls listing service",
  listRoute.includes(
    "await listAdminReconciliationTargets()"
  )
);

check(
  "target listing returns targets",
  listRoute.includes("targets")
);

check(
  "broker route requires authentication",
  brokerRoute.includes("authRequired")
);

check(
  "broker route requires ADMIN",
  brokerRoute.includes("requireAdmin")
);

check(
  "broker route uses route target id",
  /targetUserId\s*:\s*req\.params\.userId/
    .test(brokerRoute)
);

check(
  "broker route does not substitute actor id",
  !brokerRoute.includes("req.user.id")
);

check(
  "broker route returns target identity",
  brokerRoute.includes(
    "target: result.target"
  )
);

check(
  "broker route returns broker links",
  brokerRoute.includes(
    "brokers: result.brokers"
  )
);

check(
  "broker route preserves typed 4xx",
  brokerRoute.includes(
    "Number.isInteger(error?.status)"
  ) &&
  brokerRoute.includes(
    "error.status >= 400"
  ) &&
  brokerRoute.includes(
    "error.status < 500"
  )
);

check(
  "broker route has stable rejection code",
  brokerRoute.includes(
    '"RECONCILIATION_TARGET_REJECTED"'
  )
);

check(
  "unexpected broker errors reach middleware",
  brokerRoute.includes(
    "return next(error)"
  )
);

check(
  "read routes contain no portfolio replacement",
  !listRoute.includes(
    "replaceAuthoritativePortfolioSnapshot"
  ) &&
  !brokerRoute.includes(
    "replaceAuthoritativePortfolioSnapshot"
  )
);

check(
  "read routes contain no broker mutation",
  !listRoute.includes(
    "createBrokerLink"
  ) &&
  !brokerRoute.includes(
    "createBrokerLink"
  )
);

console.log(
  `ADMIN_003D6_R6E_PASS=${passed}/20`
);
