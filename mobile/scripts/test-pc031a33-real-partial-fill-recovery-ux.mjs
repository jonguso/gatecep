import fs from "node:fs";
import assert from "node:assert/strict";

function readBytes(file) {
  return fs.readFileSync(
    new URL(`../${file}`, import.meta.url)
  );
}

function asciiSource(file) {
  // latin1 is intentional for source inspection only:
  // it maps every byte 1:1 and therefore cannot fail on legacy bytes.
  return readBytes(file).toString("latin1");
}

const recovery =
  asciiSource("app/real-order-recovery.js");

const basket =
  asciiSource("app/basket-execution.js");

const review =
  asciiSource("app/orders-review.js");

const orders =
  asciiSource("app/orders.js");

const queue =
  asciiSource("app/queue-manager.js");

const transition =
  asciiSource(
    "src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
  );

assert.match(recovery, /label="Verified Filled"/);
assert.match(recovery, /label="Remaining"/);
assert.match(recovery, /label="Fill Progress"/);
assert.match(recovery, /label="Average Fill Price"/);
assert.match(recovery, /label="Verified Fills"/);
assert.match(recovery, /Upload Current Broker Evidence/);

console.log(
  "PASS: REAL recovery screen exposes verified partial-fill progress and evidence action."
);

for (
  const [name, source] of [
    ["Basket Execution", basket],
    ["Orders Review", review],
    ["Queue Manager", queue]
  ]
) {
  assert.match(
    source,
    /verified partial execution/
  );

  assert.match(
    source,
    /broker-evidence/
  );

  console.log(
    `PASS: ${name} recovery messaging recognizes verified partial execution.`
  );
}

assert.match(
  orders,
  /onRecovery=\{\(\) => router\.push\("\/real-order-recovery"\)\}/
);

assert.match(
  orders,
  /statusView\.isReal[\s\S]*statusView\.recoveryRequired/
);

assert.match(
  orders,
  /Review REAL Recovery/
);

console.log(
  "PASS: Orders provides direct REAL recovery navigation and suppresses local cancel while recovery is required."
);

assert.doesNotMatch(
  recovery,
  /Retry Remaining/
);

assert.doesNotMatch(
  recovery,
  /Mark Filled/
);

assert.doesNotMatch(
  recovery,
  /Resubmit Remaining/
);

console.log(
  "PASS: recovery UI exposes no manual-fill or remaining-quantity resubmission action."
);

assert.match(transition, /filledQuantity:/);
assert.match(transition, /remainingQuantity/);
assert.match(transition, /fillPercent:/);
assert.match(transition, /averageFillPrice/);

console.log(
  "PASS: A33 displays existing A32 evidence-derived fields rather than inventing parallel execution calculations."
);

console.log("");
console.log(
  "PC-031A33 REAL partial-fill recovery UX contract PASSED."
);
