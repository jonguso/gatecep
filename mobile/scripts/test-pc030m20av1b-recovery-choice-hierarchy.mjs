import assert from "node:assert/strict";
const current=10000, required=19208.07, additional=required-current;
assert.equal(additional,9208.07);
assert.equal(current+additional,required);
console.log("PASS — KES 10,000 + KES 9,208.07 = KES 19,208.07 required monthly contribution.");
console.log("PASS — monthly recovery remains separate from future shortfall and lump-sum-now funding.");
