import assert from "node:assert/strict";
import fs from "node:fs";

const src =
  fs.readFileSync(
    new URL(
      "../app/queue-manager.js",
      import.meta.url
    ),
    "utf8"
  ).replace(/\r\n/g, "\n");

assert.match(
  src,
  /async function load\(\)\s*\{[\s\S]*?loadBasketExecution\(\)[\s\S]*?setExecution\(saved\)/
);

const marker =
  src.indexOf(
    "PC-031B4M7C5D7F4D"
  );

assert.ok(
  marker >= 0,
  "D7F4D marker must exist"
);

const end =
  src.indexOf(
    "\n  return (",
    marker
  );

assert.ok(
  end > marker,
  "D7F4D handler boundary must exist"
);

const handler =
  src.slice(
    marker,
    end
  );

assert.match(
  handler,
  /await resumePracticeExecutionOrchestrator\(\)/
);

assert.doesNotMatch(
  handler,
  /\brefresh\s*\(/
);

const loadCalls =
  handler.match(
    /await load\(\);/g
  ) || [];

assert.equal(
  loadCalls.length,
  2,
  "D7F4D must use existing load() in both fallback/error reload paths"
);

/*
 * The UAT handler remains only an orchestrator/reload boundary.
 * It must not become another execution authority.
 */
for (const pattern of [
  /routeExecutionOrderByMode\s*\(/,
  /markExecutionOrderFilled\s*\(/,
  /settlePracticeExecutionOrder\s*\(/,
  /savePracticePortfolio\s*\(/,
  /updateExecutionOrder\s*\(/,
  /saveBasketExecution\s*\(/,
  /AsyncStorage\.setItem\s*\(/,
  /userSetItem\s*\(/,
  /setTimeout\s*\(/,
  /setInterval\s*\(/
]) {
  assert.doesNotMatch(
    handler,
    pattern
  );
}

console.log(
  "PASS — invalid D7F4C refresh() references are removed."
);

console.log(
  "PASS — Queue Manager reuses its existing load() authority."
);

console.log(
  "PASS — successful orchestrator execution may update state directly or reload persisted OMS."
);

console.log(
  "PASS — failed orchestration reloads persisted OMS before reporting the error."
);

console.log(
  "PASS — D7F4D adds no routing, settlement, portfolio, storage or timer authority."
);

console.log("");
console.log(
  "PC-031B4M7C5D7F4D Queue Manager resume reload fix contract PASSED."
);
