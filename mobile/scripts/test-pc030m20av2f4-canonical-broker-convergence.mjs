import assert from "node:assert/strict";
import {resolveCanonicalBrokerId} from "../src/services/brokers/brokerAccountStore.js";
assert.equal(resolveCanonicalBrokerId("AIB-AXYS"),"AIB");
assert.equal(resolveCanonicalBrokerId("ABC Capital"),"ABC");
assert.equal(resolveCanonicalBrokerId("NCBA Investment Bank"),"NCBA");
assert.equal(resolveCanonicalBrokerId("Dyer & Blair"),"DYER");
assert.equal(resolveCanonicalBrokerId("Faida Investment Bank"),"FAIDA");
console.log("PASS — legacy broker labels normalize to canonical broker ids.");
console.log("PASS — AIB-AXYS converges to canonical AIB without alias duplication.");
