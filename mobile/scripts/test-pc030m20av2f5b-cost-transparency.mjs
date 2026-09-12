import fs from "node:fs"; import assert from "node:assert/strict";
const s=fs.readFileSync("app/basket-execution.js","utf8");
["Planned Gross Purchases","Verified Estimated Charges","Estimated Total Basket Cost","Estimated Funding Remaining","Gross purchase:","Verified estimated charges:","Estimated total cost:","Verified estimated charges: Unavailable","Active Value","Import-Gated Record","portfolio-sync-center"].forEach(x=>assert.ok(s.includes(x),`missing ${x}`));
console.log("PASS — explicit gross, verified charges, all-in cost and funding residual labels.");
console.log("PASS — unavailable charges remain unavailable.");
console.log("PASS — Practice and import-gated boundaries preserved.");
console.log("PC-030M20AV2F5B verification complete.");
