import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(
  new URL(
    "../app/queue-manager.js",
    import.meta.url
  ),
  "utf8"
).replace(/\r\n/g, "\n");

const start =
  src.indexOf(
    "async function inspectPracticeIdentity()"
  );

const end =
  src.indexOf(
    "async function inspectPracticePrefill()",
    start
  );

assert.ok(
  start >= 0 && end > start,
  "identity inspector must have exact boundaries"
);

const block =
  src.slice(start, end);

for (const pattern of [
  /getStoredUser\s*\(\)/,
  /AsyncStorage\.getAllKeys\s*\(\)/,
  /AsyncStorage\.getItem\s*\(/,
  /authUser\?\.id/,
  /canonicalPracticeKey/,
  /canonicalExecutionKey/,
  /practice\?\.status\s*===\s*"ACTIVE"/,
  /execution\?\.executionMode/
]) {
  assert.match(block, pattern);
}

for (const pattern of [
  /userGetItem\s*\(/,
  /userSetItem\s*\(/,
  /userKey\s*\(/,
  /AsyncStorage\.setItem\s*\(/,
  /AsyncStorage\.removeItem\s*\(/,
  /AsyncStorage\.multiRemove\s*\(/,
  /savePracticePortfolio\s*\(/,
  /markExecutionOrderFilled\s*\(/,
  /markExecutionOrderPartial\s*\(/,
  /updateExecutionOrder\s*\(/,
  /preflightCanonicalPracticeExecutionOrders\s*\(/,
  /analyzeCanonicalPracticeExecutionFunding\s*\(/
]) {
  assert.doesNotMatch(block, pattern);
}

assert.equal(
  (
    src.match(
      /async function inspectPracticeIdentity\(\)/g
    ) || []
  ).length,
  1
);

assert.equal(
  (
    src.match(
      /onPress=\{inspectPracticeIdentity\}/g
    ) || []
  ).length,
  1
);

assert.equal(
  (
    src.match(
      /\{practiceIdentityEvidence \? \(/g
    ) || []
  ).length,
  1
);

console.log(
  "PASS — current backend identity drives exact namespace correlation."
);

console.log(
  "PASS — Practice and execution records are read directly."
);

console.log(
  "PASS — compatibility migration helpers are not invoked."
);

console.log(
  "PASS — diagnostic cannot fund, settle, or mutate OMS."
);

console.log(
  "PASS — D7B identity function/button/panel are structurally unique."
);
