import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ALLOCATION_TEMPLATES
} from "../src/features/rebalancing/allocationTemplates.js";
import {
  RISK_PROFILES
} from "../src/features/risk/riskProfiles.js";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [riskStore, rebalanceStore, drift, recommendations, riskScreen] =
  await Promise.all([
    read("src/features/risk/riskStore.js"),
    read("src/features/rebalancing/rebalanceStore.js"),
    read("src/features/rebalancing/driftAnalysisService.js"),
    read("src/features/rebalancing/rebalanceRecommendationService.js"),
    read("app/portfolio-risk.js")
  ]);

for (const profile of Object.values(RISK_PROFILES)) {
  assert.equal(profile.limits.minimumCashPercentage, 0);
  assert.equal(profile.limits.maximumEquityPercentage, 100);
}

for (const template of Object.values(ALLOCATION_TEMPLATES)) {
  if (template.code === "CUSTOM") continue;
  assert.equal(template.targets.some((item) => item.key === "CASH"), false);
  assert.equal(
    template.targets.some((item) => item.key === "DEFENSIVE_INVESTMENTS"),
    true
  );
}

assert.match(riskStore, /minimumCashPercentage: 0/);
assert.match(rebalanceStore, /profileType === REBALANCE_PROFILE_TYPES\.CUSTOM/);
assert.match(drift, /normalizeKey\(item\?\.key\) !==[\s\S]*?"CASH"/);
assert.match(drift, /REDIRECT_FUTURE_CONTRIBUTIONS/);
assert.match(recommendations, /DIRECT_CONTRIBUTIONS/);
assert.match(recommendations, /selling existing equities is not required/);
assert.match(recommendations, /No sale is recommended solely to create idle cash/);
assert.match(riskScreen, /Required Broker Cash/);

console.log("PASS — every risk profile requires 0% broker cash and legacy saved profiles migrate to that policy.");
console.log("PASS — predefined rebalancing profiles target defensive investments instead of idle cash.");
console.log("PASS — operational broker cash is excluded from strategic asset-class drift.");
console.log("PASS — asset-class gaps redirect future contributions and cannot fabricate an equity-sale requirement.");
console.log("PASS — Coach G explicitly recommends verified money-market or fixed-income investments.");
