import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const path =
  "backend/src/modules/admin/admin.routes.js";

const source =
  readFileSync(path, "utf8");

const routeStart =
  source.indexOf(
    '"/reconciliation-targets/:userId/broker-links/:brokerLinkId/context"'
  );

assert.ok(
  routeStart >= 0,
  "broker context route must exist"
);

const routeEnd =
  source.indexOf(
    '"/reconciliation-targets/:userId/broker-links"',
    routeStart
  );

assert.ok(
  routeEnd > routeStart,
  "broker context route must precede broker-links route"
);

const route =
  source.slice(
    routeStart,
    routeEnd
  );

let passed = 0;

function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
  console.log("PASS:", label);
}

check(
  "imports broker context service",
  source.includes(
    "getAdminReconciliationBroker"
  )
);

check(
  "context route exists",
  route.includes(
    ":brokerLinkId/context"
  )
);

check(
  "context route requires authentication",
  route.includes(
    "authRequired"
  )
);

check(
  "context route requires ADMIN",
  route.includes(
    "requireAdmin"
  )
);

check(
  "context route calls validator",
  route.includes(
    "getAdminReconciliationBroker"
  )
);

check(
  "uses explicit target route id",
  route.includes(
    "targetUserId: req.params.userId"
  )
);

check(
  "uses explicit broker link route id",
  route.includes(
    "brokerLinkId: req.params.brokerLinkId"
  )
);

check(
  "does not substitute actor as target",
  !route.includes(
    "targetUserId: req.user.id"
  )
);

check(
  "does not substitute actor as broker owner",
  !route.includes(
    "getUserBrokerLinks(req.user.id)"
  )
);

check(
  "returns validated context",
  route.includes(
    "...result"
  )
);

check(
  "preserves typed 4xx status",
  route.includes(
    "error.status >= 400"
  ) &&
  route.includes(
    "error.status < 500"
  )
);

check(
  "returns typed rejection code",
  route.includes(
    'error.code ||'
  )
);

check(
  "has stable fallback rejection code",
  route.includes(
    '"RECONCILIATION_CONTEXT_REJECTED"'
  )
);

check(
  "returns rejection message",
  route.includes(
    "message: error.message"
  )
);

check(
  "unexpected errors reach middleware",
  route.includes(
    "next(error)"
  )
);

check(
  "contains no authoritative replacement",
  !route.includes(
    "replaceAuthoritativePortfolioSnapshot"
  ) &&
  !route.includes(
    "replaceUserPortfolioSnapshot"
  )
);

check(
  "contains no broker mirror write",
  !route.includes(
    "saveBrokerMirror"
  )
);

check(
  "contains no evidence persistence",
  !route.includes(
    "userSetItem"
  ) &&
  !route.includes(
    "saveBrokerAccountEvidence"
  )
);

check(
  "contains no customer credential handling",
  !route.includes(
    "password"
  )
);

check(
  "route is read-only GET",
  source.slice(
    Math.max(0, routeStart - 30),
    routeStart
  ).includes(
    "router.get("
  )
);

console.log(
  `ADMIN_003D6_R8F_PASS=${passed}/20`
);
