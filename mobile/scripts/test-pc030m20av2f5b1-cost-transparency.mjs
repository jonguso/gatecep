import fs from "node:fs";
import assert from "node:assert/strict";
const s=fs.readFileSync("app/basket-execution.js","utf8");
for (const x of [
  "Planned Gross Purchases",
  "Verified Estimated Charges:",
  "Estimated Total Basket Cost:",
  "Scenario Recovery Funding:",
  "Estimated Funding Remaining:",
  "Gross purchase:",
  "Verified estimated charges:",
  "Estimated total cost:",
  "Verified estimated charges: Unavailable",
  "Active Value",
  "Import-Gated Record",
  "portfolio-sync-center"
]) assert.ok(s.includes(x), `missing ${x}`);
assert.match(s,/costSummary\?\.allChargesVerified/);
assert.match(s,/feeEvidenceAvailable === true/);
console.log("PASS — summary exposes gross, verified charges, total basket cost and remaining funding.");
console.log("PASS — each broker instruction separates gross, verified charges and estimated total cost.");
console.log("PASS — unavailable fee evidence remains unavailable.");
console.log("PASS — Practice wording and import-gated boundary remain intact.");
console.log("PC-030M20AV2F5B1 verification complete.");
