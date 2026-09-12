import fs from "node:fs";
import assert from "node:assert/strict";
const paths=["app/wealth-journey.js","app/goal-recovery-choice.js","app/goal-recovery-allocation.js","app/goal-recovery-preview.js","app/basket-execution.js"];
const src=Object.fromEntries(paths.map(p=>[p,fs.readFileSync(p,"utf8")]));
for(const [p,s] of Object.entries(src)){
 assert.ok(s.includes("PC-030M20AV3C RESPONSIVE CALIBRATION"),`${p}: marker missing`);
 assert.ok(s.includes("useWindowDimensions"),`${p}: width hook missing`);
 assert.ok(s.includes("maxWidth: 960"),`${p}: desktop containment missing`);
 assert.ok(s.includes("paddingBottom: 128"),`${p}: mobile overlay clearance missing`);
}
assert.ok(src["app/wealth-journey.js"].includes('stage="goals"'));
assert.ok(src["app/goal-recovery-choice.js"].includes('pathname:"/goal-recovery-allocation"'));
assert.ok(src["app/goal-recovery-allocation.js"].includes('pathname: "/goal-recovery-preview"'));
assert.ok(src["app/goal-recovery-preview.js"].includes('pathname:"/basket-execution"'));
assert.ok(src["app/goal-recovery-preview.js"].includes("buildChargesAwareRecoveryBasket"));
assert.ok(src["app/basket-execution.js"].includes('router.push("/portfolio-sync-center")'));
assert.ok(src["app/basket-execution.js"].includes("Import-Gated Record"));
assert.ok(src["app/basket-execution.js"].includes("Verified Estimated Charges"));
console.log("PASS — five AV3C screens use responsive width calibration.");
console.log("PASS — 960px desktop containment and mobile bottom clearance are present.");
console.log("PASS — Choice → Allocation → Preview → Broker Action Plan route chain remains present.");
console.log("PASS — fee-aware preview and import-gated Broker Action Plan boundaries remain present.");
console.log("PC-030M20AV3C contract verification complete.");
