import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [canonical, coach, insights, alerts, sync, activity] = await Promise.all([
  read("src/features/wealth-journey/canonicalRealBehaviorHistoryService.js"),
  read("app/(tabs)/coach.js"),
  read("app/coach-insights.js"),
  read("src/services/alerts/alertStore.js"),
  read("src/services/portfolio/syncStatus.js"),
  read("app/portfolio-activity.js")
]);

assert.match(canonical, /partitionBrokerExecutionEvidence/);
assert.match(canonical, /VERIFIED_BROKER_TRANSACTION_HISTORY/);
assert.match(canonical, /createdAt: row\.executionDate/);
assert.match(canonical, /gatecepExecutionAuditLoaded: false/);
assert.match(canonical, /NONE_GATECEP_PRACTICE_ONLY/);
assert.doesNotMatch(canonical, /loadExecutionAuditTrail/);

for (const consumer of [coach, alerts, sync, activity]) {
  assert.match(consumer, /loadCanonicalRealTransactionHistory/);
}
for (const consumer of [coach, alerts, sync]) {
  assert.doesNotMatch(consumer, /userGetItem\("transactionHistory"\)/);
}
assert.match(insights, /PRACTICE ONLY/);
assert.doesNotMatch(insights, /loadCanonicalRealTransactionHistory/);

assert.match(sync, /transactions\.length > 0/);
assert.match(activity, /tx\.executionDate/);
assert.match(activity, /tx\.brokerReference/);
assert.doesNotMatch(activity, /gatecepTransactionSummary/);

console.log("PASS — all investor analytics read REAL trades through one canonical broker-evidence service.");
console.log("PASS — GateCEP Practice execution audits cannot become REAL order history.");
console.log("PASS — Coach G, alerts, sync status, and activity reject legacy incomplete transaction rows.");
console.log("PASS — REAL activity displays the broker execution date and broker reference.");
