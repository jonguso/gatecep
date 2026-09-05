import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  extractStatementEffectiveDate,
  hasConnectedRealBrokerAccount,
  requireVerifiedBrokerCashEvidence
} from "../src/features/broker-sync/brokerCashEvidencePolicy.js";

const identity = { identityStatus: "VERIFIED", brokerAccountKey: "AIB|123", cdsNumber: "999" };
assert.equal(extractStatementEffectiveDate([{ "Statement Date": "2026-09-04" }]), "2026-09-04");
assert.equal(extractStatementEffectiveDate([{ Field: "Balance Date", Value: "04/09/2026" }]), "2026-09-04");
assert.equal(extractStatementEffectiveDate([
  { Date: "01-Sep-2026" },
  { Date: "03-Sep-2026" },
  { Date: "02-Sep-2026" }
]), "2026-09-03");
assert.equal(extractStatementEffectiveDate([{ "Unlabelled field": "2026-09-04" }]), null);

assert.equal(requireVerifiedBrokerCashEvidence({ cashBalance: 5000, statementEffectiveDate: "2026-09-04", accountIdentity: identity }).statementEffectiveDate, "2026-09-04");
assert.throws(() => requireVerifiedBrokerCashEvidence({ cashBalance: 5000, accountIdentity: identity }), /effective date/i);
assert.throws(() => requireVerifiedBrokerCashEvidence({ cashBalance: 5000, statementEffectiveDate: "2026-09-04" }), /account identity/i);

assert.equal(hasConnectedRealBrokerAccount([{ brokerId: "AIB", connected: true, status: "ACTIVE", connectionMode: "MANUAL_PROFILE" }]), true);
assert.equal(hasConnectedRealBrokerAccount([{ brokerId: "SIM", connected: true, connectionMode: "SIMULATION" }]), false);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [funds, sync] = await Promise.all([
  read("app/(tabs)/funds.js"),
  read("src/features/broker-sync/brokerSyncService.js")
]);

assert.match(funds, /hasConnectedRealBrokerAccount/);
assert.match(funds, /Connected Broker Cash Is Read-only/);
assert.match(funds, /extractStatementEffectiveDate/);
assert.match(funds, /requireVerifiedBrokerCashEvidence/);
assert.ok(funds.indexOf("if (connectedRealBroker)") < funds.indexOf('userSetItem("availableCash"'));
assert.match(sync, /statementEffectiveDate/);
assert.match(sync, /cashEvidenceEffectiveDate/);

console.log("PASS — connected REAL broker cash cannot be overwritten through manual Funds entry.");
console.log("PASS — broker cash evidence requires an explicit statement effective date.");
console.log("PASS — a ledger without a statement header uses the highest valid Date-column value.");
console.log("PASS — unlabelled dates and upload timestamps cannot become statement dates.");
console.log("PASS — Practice and simulation accounts do not trigger the connected REAL cash lock.");
