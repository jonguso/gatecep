import fs from "node:fs";
import assert from "node:assert/strict";
const s=fs.readFileSync(new URL("../app/basket-execution.js", import.meta.url),"utf8");
assert.match(s,/Planned Gross Purchases/);
assert.doesNotMatch(s,/\{brokerPlanMode \? "Indicative" : "Active"\} Value KES/);
console.log("PASS — Broker Action Plan summary uses Planned Gross Purchases.");
console.log("PASS — old Indicative Value wording is removed from BROKER_PLAN summary.");
