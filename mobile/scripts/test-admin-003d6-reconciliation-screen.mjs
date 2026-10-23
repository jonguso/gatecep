import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";

const path =
  "mobile/app/admin-broker-reconciliation.js";

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

check(
  "dedicated admin reconciliation screen exists",
  () =>
    assert.match(
      source,
      /function AdminBrokerReconciliation|function\s+AdminBrokerReconciliation/
    )
);

check(
  "uses authenticated access token",
  () =>
    assert.match(
      source,
      /accessToken/
    )
);

check(
  "verifies admin authorization",
  () =>
    assert.match(
      source,
      /loadAdminOverview/
    )
);

check(
  "requires verified ADMIN role",
  () => {
    assert.match(
      source,
      /result\?\.admin\s*===\s*true/
    );

    assert.match(
      source,
      /\.toUpperCase\(\)\s*===\s*"ADMIN"/
    );
  }
);

check(
  "loads server reconciliation targets",
  () =>
    assert.match(
      source,
      /loadAdminReconciliationTargets\(\s*accessToken\s*\)/
    )
);

check(
  "target selection is explicit",
  () =>
    assert.match(
      source,
      /chooseTarget\(target\)/
    )
);

check(
  "broker lookup uses selected target id",
  () =>
    assert.match(
      source,
      /loadAdminTargetBrokerLinks\(\s*accessToken,\s*target\.id\s*\)/
    )
);

check(
  "changing target clears selected broker",
  () =>
    assert.match(
      source,
      /setSelectedTarget\(target\)[\s\S]*?setSelectedBroker\(null\)/
    )
);

check(
  "changing target clears broker collection",
  () =>
    assert.match(
      source,
      /setSelectedBroker\(null\)[\s\S]*?setBrokers\(\[\]\)/
    )
);

check(
  "server-returned target becomes support context",
  () =>
    assert.match(
      source,
      /setSelectedTarget\(\s*result\.target\s*\|\|\s*target\s*\)/
    )
);

check(
  "server-returned brokers become selectable collection",
  () =>
    assert.match(
      source,
      /Array\.isArray\(\s*result\.brokers\s*\)/
    )
);

check(
  "screen identifies administrative support context",
  () =>
    assert.match(
      source,
      /Administrative support context/
    )
);

check(
  "screen states no impersonation",
  () =>
    assert.match(
      source,
      /without impersonating their account/
    )
);

check(
  "screen tells operator to select investor",
  () =>
    assert.match(
      source,
      /1\. Select investor/
    )
);

check(
  "screen tells operator to select broker",
  () =>
    assert.match(
      source,
      /2\. Select broker/
    )
);

check(
  "screen exposes selected support target",
  () =>
    assert.match(
      source,
      />\s*Supporting\s*</
    )
);

check(
  "workspace requires target and broker",
  () =>
    assert.match(
      source,
      /selectedTarget\s*&&\s*selectedBroker/
    )
);

check(
  "workspace reports support context ready",
  () =>
    assert.match(
      source,
      /Support context ready/
    )
);

check(
  "screen exposes valuation evidence preview",
  () =>
    assert.match(
      source,
      /admin-reconciliation-preview-valuation/
    )
);

check(
  "screen exposes cash evidence preview",
  () =>
    assert.match(
      source,
      /admin-reconciliation-preview-cash/
    )
);

check(
  "screen previews valuation evidence explicitly",
  () =>
    assert.match(
      source,
      /pickAndPreviewEvidence\s*\(\s*"valuation"\s*\)/
    )
);

check(
  "screen previews cash evidence explicitly",
  () =>
    assert.match(
      source,
      /pickAndPreviewEvidence\s*\(\s*"cash"\s*\)/
    )
);

check(
  "screen keeps valuation and cash preview state separate",
  () => {
    assert.match(
      source,
      /valuationPreview/
    );

    assert.match(
      source,
      /cashPreview/
    );
  }
);

check(
  "screen requires independent evidence verification before reconciliation",
  () =>
    assert.match(
      source,
      /Both valuation and cash[\s\S]*independently verified[\s\S]*No portfolio changes/
    )
);

check(
  "screen does not navigate to investor sync center",
  () =>
    assert.doesNotMatch(
      source,
      /portfolio-sync-center/
    )
);

check(
  "screen does not replace authoritative portfolio",
  () =>
    assert.doesNotMatch(
      source,
      /replaceAuthoritative|authoritative-snapshot/
    )
);

check(
  "screen does not use investor local broker storage",
  () =>
    assert.doesNotMatch(
      source,
      /userGetItem|AsyncStorage|brokerAccounts/
    )
);

check(
  "screen does not request customer credentials",
  () =>
    assert.doesNotMatch(
      source,
      /customerPassword|investorPassword|targetPassword/
    )
);

check(
  "screen has stable test id",
  () =>
    assert.match(
      source,
      /gatecep-admin-broker-reconciliation/
    )
);

console.log(
  `ADMIN_003D6_R7E_PASS=${passed}/29`
);
