import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/features/profile/investorProfileContract.js", import.meta.url),
  "utf8"
);
const contract = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const journeyStorage = {
  profile: {
    name: "Jared Onguso",
    goal: "family",
    risk: "growth",
    experience: "invested_before",
    timeHorizon: "later",
    contribution: "monthly",
    marketDrop: "wait",
    amount: 10000,
    dna: { riskProfile: "Growth" },
    wealthBlueprint: { title: "Family plan" }
  },
  broker: { name: "AIB-AXYS" },
  investorDNA: { confidence: "developing" },
  coachG: { completed: true }
};

const normalized = contract.normalizeInvestorProfile(journeyStorage);
assert.equal(normalized.name, "Jared Onguso");
assert.equal(normalized.goal, "Family Security");
assert.equal(normalized.risk, "Growth");
assert.equal(normalized.experience, "Intermediate");
assert.equal(normalized.timeHorizon, "5+ Years");
assert.equal(normalized.contribution, "Monthly");
assert.equal(normalized.marketDrop, "Wait");

const localWins = contract.mergeProfileSources(
  { profile: { name: "User", goal: "growth", timeHorizon: "soon" } },
  journeyStorage
);
assert.equal(localWins.name, "Jared Onguso");
assert.equal(localWins.goal, "Family Security");
assert.equal(localWins.timeHorizon, "5+ Years");

const stored = contract.mergeInvestorProfileStorage(journeyStorage, {
  name: "Jared Updated",
  goal: "Retirement",
  timeHorizon: "3-5 Years"
});
assert.equal(stored.profile.name, "Jared Updated");
assert.equal(stored.profile.goal, "Retirement");
assert.deepEqual(stored.investorDNA, journeyStorage.investorDNA);
assert.deepEqual(stored.profile.dna, journeyStorage.profile.dna);
assert.deepEqual(stored.profile.wealthBlueprint, journeyStorage.profile.wealthBlueprint);
assert.deepEqual(stored.broker, journeyStorage.broker);

console.log("PASS — Journey codes map to edit-card display values.");
console.log("PASS — latest local profile wins over stale cloud profile.");
console.log("PASS — profile updates preserve Journey, DNA, blueprint, and broker data.");
