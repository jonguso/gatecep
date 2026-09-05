import assert from "node:assert/strict";
import {
  extractStatementEffectiveDate,
  normalizeBrokerStatementDate
} from "../src/features/broker-sync/brokerCashEvidencePolicy.js";

assert.equal(normalizeBrokerStatementDate("03-Sep-2026"), "2026-09-03");
assert.equal(normalizeBrokerStatementDate("3 September 2026"), "2026-09-03");
assert.equal(normalizeBrokerStatementDate("2026-09-03"), "2026-09-03");
assert.equal(extractStatementEffectiveDate([
  { Date: "01-Sep-2026", Balance: "5,779.40" },
  { Date: "03-Sep-2026", Balance: "792.20" }
]), "2026-09-03");

console.log("PASS — named-month broker dates normalize consistently on mobile.");
console.log("PASS — the latest Date-column entry becomes the statement effective date.");
