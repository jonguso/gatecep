import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(
  new URL(
    "../app/queue-manager.js",
    import.meta.url
  ),
  "utf8"
).replace(/\r\n/g, "\n");

const start = src.indexOf(
  "async function releaseClosedPracticeExecutionForUAT()"
);

const end = src.indexOf(
  "async function inspectPracticeExecutionArchive()",
  start
);

assert.ok(
  start >= 0 && end > start,
  "release UAT handler must exist"
);

const block = src.slice(start, end);

assert.match(
  block,
  /const releasePass\s*=/
);

assert.match(
  block,
  /activeSlotReleased\s*&&/
);

assert.match(
  block,
  /matchingRecords\.length\s*===\s*1/
);

assert.match(
  block,
  /archivedOrders\.length\s*===\s*2/
);

assert.match(
  block,
  /archivedFilled\.length\s*===\s*2/
);

assert.doesNotMatch(
  block,
  /history\.length\s*===\s*1/
);

assert.match(
  block,
  /totalArchiveRecords:\s*history\.length/
);

assert.match(
  block,
  /await clearBasketExecution\s*\(\s*\)/
);

/*
 * Observer screens must not acquire execution-creation
 * authority. The release handler should contain no executable
 * createBasketExecution call.
 */
const executableBlock =
  block
    .replace(
      /\/\*[\s\S]*?\*\//g,
      ""
    )
    .replace(
      /\/\/.*$/gm,
      ""
    );

assert.doesNotMatch(
  executableBlock,
  /\bcreateBasketExecution\s*\(/
);

console.log(
  "PASS — release evidence is scoped to the released execution ID."
);

console.log(
  "PASS — exactly one matching archive is required."
);

console.log(
  "PASS — multiple historical Practice archives are allowed."
);

console.log(
  "PASS — total archive count remains observational evidence."
);

console.log(
  "PASS — central clearBasketExecution remains the release authority."
);

console.log();
console.log(
  "PC-031B4M7C5D7F5J2D7H6A release evidence cardinality contract PASSED."
);
