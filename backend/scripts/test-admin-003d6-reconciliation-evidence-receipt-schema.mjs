import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  "src/database/migrations/015_admin_reconciliation_evidence_receipts.sql";

const source =
  fs.readFileSync(
    path,
    "utf8"
  );

let assertions = 0;

function check(
  condition,
  message
) {
  assert.ok(
    condition,
    message
  );

  assertions += 1;

  console.log(
    `PASS ${assertions} — ${message}`
  );
}

check(
  /\bBEGIN\s*;/i.test(source) &&
  /\bCOMMIT\s*;/i.test(source),
  "migration is transactional"
);

check(
  /CREATE TABLE IF NOT EXISTS[\s\S]*admin_reconciliation_evidence_receipts/i.test(
    source
  ),
  "dedicated Admin evidence receipt table exists"
);

check(
  /id UUID PRIMARY KEY DEFAULT uuid_generate_v4\(\)/i.test(
    source
  ),
  "receipt uses repository UUID convention"
);

for (
  const column of [
    "actor_user_id",
    "target_user_id",
    "broker_link_id"
  ]
) {
  check(
    new RegExp(
      `${column}\\s+UUID\\s+NOT\\s+NULL`,
      "i"
    ).test(source),
    `${column} is required`
  );
}

check(
  /actor_user_id[\s\S]*REFERENCES public\.auth_users\(id\)/i.test(
    source
  ),
  "actor references persisted auth user"
);

check(
  /target_user_id[\s\S]*REFERENCES public\.auth_users\(id\)/i.test(
    source
  ),
  "target references persisted auth user"
);

check(
  /broker_link_id[\s\S]*REFERENCES public\.user_broker_links\(id\)/i.test(
    source
  ),
  "receipt references current user_broker_links infrastructure"
);

check(
  /actor_user_id\s*<>\s*target_user_id/i.test(
    source
  ),
  "Admin actor and reconciliation target must be distinct"
);

check(
  /broker_account_key\s+TEXT\s+NOT\s+NULL/i.test(
    source
  ),
  "receipt binds canonical broker account key"
);

check(
  /report_type\s+TEXT\s+NOT\s+NULL/i.test(
    source
  ) &&
  /'valuation'[\s\S]*'cash'/i.test(
    source
  ),
  "receipt is restricted to valuation or cash evidence"
);

check(
  /file_sha256\s+TEXT\s+NOT\s+NULL/i.test(
    source
  ) &&
  /\^\[0-9a-f\]\{64\}\$/i.test(
    source
  ),
  "receipt binds lowercase SHA-256 evidence digest"
);

check(
  /extraction_payload\s+JSONB\s+NOT\s+NULL/i.test(
    source
  ),
  "server extraction payload is persisted"
);

check(
  /identity_verification\s+JSONB\s+NOT\s+NULL/i.test(
    source
  ),
  "server identity verification is persisted"
);

check(
  /expires_at\s+TIMESTAMPTZ\s+NOT\s+NULL/i.test(
    source
  ),
  "receipt has explicit expiration"
);

check(
  /consumed_at\s+TIMESTAMPTZ/i.test(
    source
  ),
  "receipt has single-use consumption marker"
);

check(
  /expires_at\s*>\s*created_at/i.test(
    source
  ),
  "expiration must follow creation"
);

check(
  /consumed_at\s+IS\s+NULL[\s\S]*consumed_at\s*>=\s*created_at/i.test(
    source
  ),
  "consumption timestamp cannot precede creation"
);

check(
  !/\bBYTEA\b/i.test(source) &&
  !/raw_pdf/i.test(source) &&
  !/pdf_bytes/i.test(source),
  "receipt schema does not store raw PDF bytes"
);

check(
  !/password|authorization|access_token|refresh_token|jwt/i.test(
    source
  ),
  "receipt schema contains no authentication secrets"
);

check(
  /WHERE\s+consumed_at\s+IS\s+NULL/i.test(
    source
  ),
  "unconsumed receipt expiry lookup is indexed"
);

console.log(
  `R8J4E_ASSERTIONS=${assertions}`
);

console.log(
  "ADMIN_003D6_R8J4E=COMPLETE"
);
