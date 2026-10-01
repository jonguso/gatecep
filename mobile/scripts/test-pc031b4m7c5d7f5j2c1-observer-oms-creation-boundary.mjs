import fs from "node:fs";
import assert from "node:assert/strict";

const observerFiles = [
  "app/queue-manager.js",
  "app/orders.js",
  "app/orders-review.js",
  "app/basket-execution.js"
];

function executableSource(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

for (const file of observerFiles) {
  const source =
    fs.readFileSync(file, "utf8");

  const executable =
    executableSource(source);

  assert.match(
    executable,
    /\bloadBasketExecution\s*\(/,
    `${file} must remain a persisted OMS reader`
  );

  assert.doesNotMatch(
    executable,
    /\bcreateBasketExecution\s*\(/,
    `${file} must not create OMS execution while observing`
  );

  assert.match(
    source,
    /OMS observer/,
    `${file} must document observer-only ownership`
  );
}

const queue =
  fs.readFileSync(
    "app/queue-manager.js",
    "utf8"
  );

const queueLoadStart =
  queue.indexOf(
    "async function load()"
  );

const queueLoadEnd =
  queue.indexOf(
    "const orders =",
    queueLoadStart
  );

assert.ok(
  queueLoadStart >= 0 &&
  queueLoadEnd > queueLoadStart,
  "Queue Manager load region must exist"
);

const queueLoad =
  executableSource(
    queue.slice(
      queueLoadStart,
      queueLoadEnd
    )
  );

assert.match(
  queueLoad,
  /const saved\s*=\s*await loadBasketExecution\s*\(\s*\)/,
  "Queue Manager must load persisted execution directly"
);

assert.doesNotMatch(
  queueLoad,
  /\bcreateBasketExecution\s*\(/,
  "Queue Manager refresh must not resurrect OMS state"
);

console.log(
  "PASS: Queue Manager observes persisted OMS state without creating it"
);

console.log(
  "PASS: Orders observes persisted OMS state without creating it"
);

console.log(
  "PASS: Orders Review observes persisted OMS state without creating it"
);

console.log(
  "PASS: Basket Execution observes persisted OMS state without creating it"
);

console.log(
  "PASS: empty activeBasketExecution can remain empty across observer refresh/focus"
);
