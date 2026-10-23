import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routePath =
  new URL(
    "../src/modules/admin/admin.routes.js",
    import.meta.url
  );

const source =
  readFileSync(
    routePath,
    "utf8"
  );

let passed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${passed}: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

const previewStart =
  source.indexOf(
    '"/reconciliation-targets/:userId/broker-links/:brokerLinkId/evidence-preview"'
  );

assert.notEqual(
  previewStart,
  -1,
  "Evidence preview route was not found."
);

const contextStart =
  source.indexOf(
    '"/reconciliation-targets/:userId/broker-links/:brokerLinkId/context"',
    previewStart
  );

assert.notEqual(
  contextStart,
  -1,
  "Context route boundary was not found."
);

const preview =
  source.slice(
    previewStart,
    contextStart
  );

check(
  "identity verifier is imported",
  () => {
    assert.match(
      source,
      /verifyAdminReconciliationEvidenceIdentity/
    );

    assert.match(
      source,
      /adminReconciliationEvidenceIdentity\.service\.js/
    );
  }
);

check(
  "preview remains POST",
  () => {
    const prefix =
      source.slice(
        Math.max(0, previewStart - 30),
        previewStart
      );

    assert.match(
      prefix,
      /router\.post\(\s*$/
    );
  }
);

check(
  "preview requires authentication",
  () => {
    assert.match(
      preview,
      /\bauthRequired\b/
    );
  }
);

check(
  "preview requires ADMIN authorization",
  () => {
    assert.match(
      preview,
      /\brequireAdmin\b/
    );
  }
);

check(
  "preview accepts one file field",
  () => {
    assert.match(
      preview,
      /reconciliationEvidenceUpload\.single\("file"\)/
    );
  }
);

check(
  "target and broker are revalidated server-side",
  () => {
    assert.match(
      preview,
      /getAdminReconciliationBroker\s*\(/
    );
  }
);

check(
  "target comes from route userId",
  () => {
    assert.match(
      preview,
      /targetUserId\s*:\s*req\.params\.userId/
    );
  }
);

check(
  "broker link comes from route brokerLinkId",
  () => {
    assert.match(
      preview,
      /brokerLinkId\s*:\s*req\.params\.brokerLinkId/
    );
  }
);

check(
  "canonical PDF parser is invoked",
  () => {
    assert.match(
      preview,
      /extractBrokerPdf\s*\(/
    );
  }
);

check(
  "uploaded buffer is parsed",
  () => {
    assert.match(
      preview,
      /req\.file\.buffer/
    );
  }
);

check(
  "requested report type reaches parser",
  () => {
    assert.match(
      preview,
      /requestedReportType/
    );
  }
);

check(
  "identity verifier is invoked after extraction",
  () => {
    const extractionIndex =
      preview.indexOf(
        "const extraction ="
      );

    const verificationIndex =
      preview.indexOf(
        "const identityVerification ="
      );

    assert.ok(
      extractionIndex >= 0
    );

    assert.ok(
      verificationIndex >
        extractionIndex
    );
  }
);

check(
  "verifier receives server broker context",
  () => {
    assert.match(
      preview,
      /broker\s*:\s*context\.broker/
    );
  }
);

check(
  "verifier receives extraction result",
  () => {
    assert.match(
      preview,
      /verifyAdminReconciliationEvidenceIdentity\s*\(\s*\{[\s\S]*?\bextraction\b[\s\S]*?\}\s*\)/
    );
  }
);

check(
  "response remains explicitly preview-only",
  () => {
    assert.match(
      preview,
      /previewOnly\s*:\s*true/
    );
  }
);

check(
  "response returns validated target",
  () => {
    assert.match(
      preview,
      /target\s*:\s*context\.target/
    );
  }
);

check(
  "response returns validated broker",
  () => {
    assert.match(
      preview,
      /broker\s*:\s*context\.broker/
    );
  }
);

check(
  "response returns server-derived account key",
  () => {
    assert.match(
      preview,
      /brokerAccountKey\s*:\s*[\r\n\s]*context\.brokerAccountKey/
    );
  }
);

check(
  "response returns extraction",
  () => {
    assert.match(
      preview,
      /\bextraction\s*,/
    );
  }
);

check(
  "response returns identity verification separately",
  () => {
    assert.match(
      preview,
      /\bidentityVerification\b/
    );
  }
);

check(
  "route does not fabricate identityVerified true",
  () => {
    assert.doesNotMatch(
      preview,
      /identityVerified\s*:\s*true/
    );
  }
);

check(
  "route does not fabricate identityVerified false",
  () => {
    assert.doesNotMatch(
      preview,
      /identityVerified\s*:\s*false/
    );
  }
);

check(
  "preview does not save broker mirror",
  () => {
    assert.doesNotMatch(
      preview,
      /saveBrokerMirror/
    );
  }
);

check(
  "preview does not replace authoritative portfolio",
  () => {
    assert.doesNotMatch(
      preview,
      /replaceAuthoritative|replaceUserPortfolio/
    );
  }
);

check(
  "preview does not use investor local storage",
  () => {
    assert.doesNotMatch(
      preview,
      /userSetItem|userGetItem/
    );
  }
);

check(
  "preview does not trust body broker identity",
  () => {
    assert.doesNotMatch(
      preview,
      /req\.body\.(broker|clientNumber|cdsNumber|brokerLinkId|targetUserId)/
    );
  }
);

check(
  "preview contains no SQL mutation",
  () => {
    assert.doesNotMatch(
      preview,
      /\b(?:INSERT|UPDATE|DELETE)\b/i
    );
  }
);

check(
  "missing evidence remains rejected",
  () => {
    assert.match(
      preview,
      /RECONCILIATION_EVIDENCE_REQUIRED/
    );
  }
);

check(
  "unsupported evidence remains rejected",
  () => {
    assert.match(
      preview,
      /RECONCILIATION_EVIDENCE_TYPE_UNSUPPORTED/
    );
  }
);

check(
  "extraction failure remains typed",
  () => {
    assert.match(
      preview,
      /RECONCILIATION_EVIDENCE_EXTRACTION_FAILED/
    );
  }
);

if (process.exitCode) {
  console.error(
    `ADMIN_003D6_R8H11_FAIL=${passed}/30`
  );
  process.exit(1);
}

assert.equal(
  passed,
  30
);

console.log(
  "ADMIN_003D6_R8H11_PASS=30/30"
);
