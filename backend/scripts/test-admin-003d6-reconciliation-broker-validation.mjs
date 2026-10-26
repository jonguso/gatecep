import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const path =
  "backend/src/modules/admin/adminReconciliationTarget.service.js";

const source =
  readFileSync(path, "utf8");

let passed = 0;

function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
  console.log("PASS:", label);
}

check(
  "exports reconciliation broker validator",
  source.includes(
    "export async function getAdminReconciliationBroker"
  )
);

check(
  "requires explicit target user id",
  source.includes(
    'String(targetUserId || "").trim()'
  )
);

check(
  "requires explicit broker link id",
  source.includes(
    'String(brokerLinkId || "").trim()'
  )
);

check(
  "rejects missing target",
  source.includes(
    '"RECONCILIATION_TARGET_REQUIRED"'
  )
);

check(
  "rejects missing broker",
  source.includes(
    '"RECONCILIATION_BROKER_REQUIRED"'
  )
);

check(
  "loads persisted target",
  source.includes(
    "await findUserById("
  )
);

check(
  "reuses eligible target validation",
  source.includes(
    "assertEligibleTarget("
  )
);

check(
  "loads brokers by validated target",
  source.includes(
    "await getUserBrokerLinks(user.id)"
  )
);

check(
  "matches server broker link id",
  source.includes(
    "String(item?.id || \"\").trim() ==="
  ) &&
  source.includes(
    "normalizedBrokerLinkId"
  )
);

check(
  "rejects broker not owned by target",
  source.includes(
    '"RECONCILIATION_BROKER_NOT_OWNED"'
  )
);

check(
  "requires active broker",
  source.includes(
    '"RECONCILIATION_BROKER_INACTIVE"'
  )
);

check(
  "requires broker identity",
  source.includes(
    '"RECONCILIATION_BROKER_IDENTITY_INCOMPLETE"'
  )
);

check(
  "normalizes broker id",
  source.includes(
    'String(broker.broker || "")'
  ) &&
  source.includes(
    ".toUpperCase()"
  )
);

check(
  "uses persisted client number",
  source.includes(
    'String(broker.clientNumber || "")'
  )
);

check(
  "returns validated target",
  source.includes(
    "target: safeTarget(user)"
  )
);

check(
  "returns validated broker",
  source.includes(
    "broker: {"
  ) &&
  source.includes(
    "...broker"
  )
);

check(
  "derives canonical Transaction History account key server-side",
  source.includes(
    "canonicalTransactionHistoryBroker"
  ) &&
  source.includes(
    "`${canonicalTransactionHistoryBroker("
  ) &&
  source.includes(
    ")}|${clientNumber}`"
  )
);

check(
  "does not use request actor as target",
  !source.includes(
    "req.user"
  )
);

check(
  "does not use mobile storage",
  !source.includes(
    "userGetItem"
  ) &&
  !source.includes(
    "userSetItem"
  )
);

check(
  "does not mutate authoritative portfolio",
  !source.includes(
    "replaceAuthoritativePortfolioSnapshot"
  ) &&
  !source.includes(
    "replaceUserPortfolioSnapshot"
  )
);

console.log(
  `ADMIN_003D6_R8D_PASS=${passed}/20`
);
