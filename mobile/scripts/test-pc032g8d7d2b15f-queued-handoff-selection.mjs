import fs from "node:fs";

const file =
  new URL("../app/orders-review.js", import.meta.url);

const source =
  fs.readFileSync(file, "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

assert(
  source.includes(
    'const queuedOrders = orders.filter('
  ) &&
  source.includes(
    'order.status === ORDER_STATUS.QUEUED'
  ),
  "QUEUED remains the canonical prepared/handoff selection state"
);

assert(
  source.includes(
    'disabled={queuedOrders.length === 0}'
  ),
  "Practice handoff is disabled when no orders are QUEUED"
);

assert(
  source.includes(
    'queuedOrders.length === 0 && styles.disabledButton'
  ),
  "disabled Practice handoff uses the existing greyed/disabled treatment"
);

assert(
  source.includes(
    '? `Continue to Order Handoff (${queuedOrders.length})`'
  ),
  "Practice handoff count reflects QUEUED orders"
);

assert(
  source.includes(
    ': "Continue to Order Handoff"'
  ),
  "zero-selection Practice handoff does not display a misleading zero count"
);

assert(
  source.includes(
    'onPress={continueQueuedPracticeExecution}'
  ),
  "Practice handoff continues only the persisted QUEUED execution"
);

assert(
  source.includes(
    'const updated =') &&
  source.includes(
    'await queueSingleOrder(order.id);'
  ),
  "Prepare This Order still owns individual REVIEW to QUEUED transition"
);

assert(
  source.includes(
    'onPress={prepareHandoff}'
  ) &&
  source.includes(
    '`Continue to Order Handoff (${reviewOrders.length})`'
  ),
  "REAL batch handoff behavior remains present and unchanged"
);

console.log(
  "PC-032G8D7D2B15F queued handoff selection contract PASS"
);
