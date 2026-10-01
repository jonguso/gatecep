import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs
  .readFileSync(
    new URL(
      "../app/basket-execution.js",
      import.meta.url
    ),
    "utf8"
  )
  .replace(/\r\n/g, "\n");

const queueLabel =
  source.indexOf("Open Queue Manager");

assert.notEqual(
  queueLabel,
  -1,
  "Open Queue Manager control must exist"
);

const queueStart =
  source.lastIndexOf(
    "<Pressable",
    queueLabel
  );

const queueEnd =
  source.indexOf(
    "</Pressable>",
    queueLabel
  );

assert.ok(
  queueStart >= 0 &&
  queueEnd > queueLabel,
  "Queue Manager Pressable block must be discoverable"
);

const queueBlock =
  source.slice(
    queueStart,
    queueEnd + "</Pressable>".length
  );

assert.match(
  queueBlock,
  /router\.push\s*\(\s*["']\/queue-manager["']\s*\)/
);

assert.doesNotMatch(
  queueBlock,
  /\/\(tabs\)\/trading/
);

console.log(
  "PASS — Open Queue Manager routes to canonical /queue-manager."
);

/*
 * Preserve Broker Routing until its route is audited separately.
 */
const brokerLabel =
  source.indexOf("Open Broker Routing");

assert.notEqual(
  brokerLabel,
  -1,
  "Open Broker Routing control must exist"
);

const brokerStart =
  source.lastIndexOf(
    "<Pressable",
    brokerLabel
  );

const brokerEnd =
  source.indexOf(
    "</Pressable>",
    brokerLabel
  );

const brokerBlock =
  source.slice(
    brokerStart,
    brokerEnd + "</Pressable>".length
  );

assert.match(
  brokerBlock,
  /router\.push\s*\(\s*["']\/\(tabs\)\/trading["']\s*\)/
);

console.log(
  "PASS — Broker Routing destination was not changed by I3B1."
);

/*
 * Navigation repair must not introduce execution authority.
 */
const executable =
  queueBlock
    .replace(
      /\/\*[\s\S]*?\*\//g,
      ""
    )
    .replace(
      /\/\/.*$/gm,
      ""
    );

assert.doesNotMatch(
  executable,
  /\bcreateBasketExecution\s*\(/
);

assert.doesNotMatch(
  executable,
  /\bclearBasketExecution\s*\(/
);

assert.doesNotMatch(
  executable,
  /\bqueueSingleOrder\s*\(/
);

assert.doesNotMatch(
  executable,
  /\bmarkExecutionOrderFilled\s*\(/
);

assert.doesNotMatch(
  executable,
  /\bsettlePracticeExecutionOrder\s*\(/
);

console.log(
  "PASS — route repair acquires no OMS, queue, fill or settlement authority."
);

console.log();
console.log(
  "PC-031B4M7C5D7F5J2D7I3B1 Queue Manager route contract PASSED."
);
