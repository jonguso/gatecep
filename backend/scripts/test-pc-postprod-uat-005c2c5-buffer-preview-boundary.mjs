import assert from "node:assert/strict";
import fs from "node:fs";

const SERVICE =
  "backend/src/modules/fundamental-evidence/issuerFinancialEvidencePreview.service.js";

const ROUTES =
  "backend/src/modules/fundamental-evidence/fundamentalEvidence.routes.js";

const service =
  fs.readFileSync(
    SERVICE,
    "utf8"
  );

const routes =
  fs.readFileSync(
    ROUTES,
    "utf8"
  );

console.log(
  "===== PC-POSTPROD-UAT-005C2C5 CONTRACT ====="
);

assert.match(
  service,
  /export async function previewIssuerFinancialEvidenceFromBuffer\s*\(/
);

console.log(
  "PASS — shared buffer preview export exists"
);

assert.match(
  service,
  /Buffer\.isBuffer\(documentBuffer\)/
);

assert.match(
  service,
  /documentBuffer instanceof Uint8Array/
);

console.log(
  "PASS — buffer input is explicitly bounded to binary document input"
);

assert.match(
  service,
  /persistence:\s*"NONE"/
);

assert.match(
  service,
  /verifiedFiling:\s*false/
);

assert.match(
  service,
  /verified:\s*false/
);

assert.match(
  service,
  /authoritative:\s*false/
);

console.log(
  "PASS — buffer preview cannot elevate persistence or trust"
);

assert.match(
  service,
  /inspectIssuerDocumentIdentity\s*\(\s*\{[\s\S]*?documentBuffer/
);

assert.match(
  service,
  /extractIssuerFinancialStatementEvidence\s*\(\s*\{[\s\S]*?documentBuffer/
);

console.log(
  "PASS — buffer follows existing identity and extraction boundaries"
);

assert.match(
  service,
  /return previewIssuerFinancialEvidenceFromBuffer\s*\(\s*\{[\s\S]*?retrieval/
);

console.log(
  "PASS — URL preview delegates to shared buffer boundary"
);

assert.match(
  service,
  /retrieval\?\.persistence !== "NONE"/
);

assert.match(
  service,
  /retrieval\?\.verifiedFiling !== false/
);

assert.match(
  service,
  /retrieval\?\.verified === true/
);

assert.match(
  service,
  /retrieval\?\.authoritative === true/
);

console.log(
  "PASS — URL retrieval safety guard remains intact"
);

assert.match(
  routes,
  /router\.post\s*\(\s*["']\/issuer-document\/preview["']/
);

assert.match(
  routes,
  /previewIssuerFinancialEvidence\s*\(\s*\{[\s\S]*?symbol[\s\S]*?url/
);

console.log(
  "PASS — existing authenticated URL route remains unchanged"
);

assert.doesNotMatch(
  routes,
  /multer/
);

assert.doesNotMatch(
  routes,
  /issuer-document\/upload/
);

console.log(
  "PASS — C2C5 introduces no upload route"
);

assert.doesNotMatch(
  service,
  /writeFile|writeFileSync|appendFile|appendFileSync/
);

console.log(
  "PASS — preview service contains no file persistence operation"
);

console.log(
  "PC-POSTPROD-UAT-005C2C5 CONTRACT: PASS"
);
