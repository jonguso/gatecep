import fs from "node:fs";
import assert from "node:assert/strict";
const s=fs.readFileSync(new URL("../app/basket-execution.js",import.meta.url),"utf8");
assert.match(s,/Planned Gross Purchases/);
assert.doesNotMatch(s,/Indicative Value/);
console.log("PASS — Broker Action Plan labels gross basket value as Planned Gross Purchases.");
console.log("PASS — ambiguous Indicative Value label is removed.");
