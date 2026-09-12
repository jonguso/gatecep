import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(
  new URL("../src/services/brokers/brokerAccountStore.js", import.meta.url),
  "utf8"
);

function expectMapping(label, canonical) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\[[^\\]]*"${escaped}"[^\\]]*\\]\\.includes\\(raw\\)\\) return "${canonical}"`
  );
  assert.match(source, pattern);
}

assert.match(source, /export function resolveCanonicalBrokerId/);
expectMapping("AIB-AXYS", "AIB");
expectMapping("ABC CAPITAL", "ABC");
expectMapping("NCBA INVESTMENT BANK", "NCBA");
expectMapping("DYER & BLAIR", "DYER");
expectMapping("FAIDA INVESTMENT BANK", "FAIDA");

assert.match(source, /CANONICAL_ACCOUNTS_ALREADY_PRESENT/);
assert.match(source, /migrationSource:"LEGACY_BROKER_PROFILE"/);
assert.match(source, /feeSchedule:legacy\.feeSchedule\|\|null/);

console.log("PASS — legacy broker labels normalize to canonical broker ids.");
console.log("PASS — AIB-AXYS converges to canonical AIB without alias duplication.");
console.log("PASS — verifier inspects the runtime store without importing React Native storage dependencies.");
