import fs from "node:fs";
import assert from "node:assert/strict";

const coach = fs.readFileSync(
  "app/coach-insights.js",
  "utf8"
);

const trade = fs.readFileSync(
  "app/trade.js",
  "utf8"
);

const store = fs.readFileSync(
  "src/services/trade/basketExecutionStore.js",
  "utf8"
);

function indexOrFail(source, needle, label) {
  const index = source.indexOf(needle);

  assert.ok(
    index >= 0,
    `${label} must exist`
  );

  return index;
}

/*
 * Both callers must use the canonical active status helper.
 */
assert.match(
  coach,
  /import \{ isActiveOrder \} from "\.\.\/src\/trade\/orderLifecycle";/,
  "Coach G must import canonical isActiveOrder()"
);

assert.match(
  trade,
  /import \{ isActiveOrder \} from "\.\.\/src\/trade\/orderLifecycle";/,
  "REAL Trade must import canonical isActiveOrder()"
);

/*
 * Coach G guard ordering.
 */
const coachStart = indexOrFail(
  coach,
  "async function createTradeBasketFromRecommendation()",
  "Coach G basket function"
);

const coachSection = coach.slice(coachStart);

const coachLoad = indexOrFail(
  coachSection,
  "await loadBasketExecution()",
  "Coach G execution load"
);

const coachActive = indexOrFail(
  coachSection,
  "isActiveOrder(order.status)",
  "Coach G canonical active check"
);

const coachSave = indexOrFail(
  coachSection,
  "await saveTradeBasket(",
  "Coach G basket save"
);

const coachCreate = indexOrFail(
  coachSection,
  "createBasketExecution({",
  "Coach G execution creation"
);

assert.ok(
  coachLoad < coachSave,
  "Coach G must load active OMS state before saveTradeBasket()"
);

assert.ok(
  coachActive < coachSave,
  "Coach G canonical active check must precede saveTradeBasket()"
);

assert.ok(
  coachSave < coachCreate,
  "Coach G creates execution only after protected basket save"
);

assert.match(
  coachSection,
  /if \(hasActiveExecution\) \{[\s\S]*?Practice Execution Already Active[\s\S]*?Open Current Execution[\s\S]*?router\.push\("\/basket-execution"\)[\s\S]*?return;/,
  "Coach G must preserve and expose the current execution"
);

/*
 * REAL Trade guard ordering.
 */
const realStart = indexOrFail(
  trade,
  "async function proceedRealOrderToReview()",
  "REAL review function"
);

const realSection = trade.slice(realStart);

const realLoad = indexOrFail(
  realSection,
  "await loadBasketExecution()",
  "REAL execution load"
);

const realActive = indexOrFail(
  realSection,
  "isActiveOrder(order.status)",
  "REAL canonical active check"
);

const realSave = indexOrFail(
  realSection,
  "await saveTradeBasket(",
  "REAL basket save"
);

const realCreate = indexOrFail(
  realSection,
  "createBasketExecution({ forceNew: true })",
  "REAL execution creation"
);

assert.ok(
  realLoad < realSave,
  "REAL must load active OMS state before saveTradeBasket()"
);

assert.ok(
  realActive < realSave,
  "REAL canonical active check must precede saveTradeBasket()"
);

assert.ok(
  realSave < realCreate,
  "REAL creates execution only after protected basket save"
);

assert.doesNotMatch(
  realSection.slice(0, realSave),
  /existingExecution\?\.activeOrders/,
  "REAL caller must no longer depend on aggregate activeOrders"
);

assert.match(
  realSection,
  /if \(hasActiveExecution\) \{[\s\S]*?Active Orders Already Exist[\s\S]*?Open Current Execution[\s\S]*?router\.push\("\/basket-execution"\)[\s\S]*?return;/,
  "REAL caller must preserve and expose the current execution"
);

/*
 * Central authority must remain fail closed.
 */
assert.match(
  store,
  /const hasActiveExecution =[\s\S]*?isActiveOrder\(order\.status\)[\s\S]*?if \(hasActiveExecution\) \{[\s\S]*?if \(forceNew\) \{[\s\S]*?ACTIVE_EXECUTION_REPLACEMENT_FORBIDDEN[\s\S]*?throw error;/,
  "D7F5G central replacement guard must remain intact"
);

/*
 * Caller guards must not gain OMS mutation authority.
 */
const coachGuardRegion =
  coachSection.slice(
    0,
    coachSave
  );

const realGuardRegion =
  realSection.slice(
    0,
    realSave
  );

for (const [name, region] of [
  ["Coach G", coachGuardRegion],
  ["REAL Trade", realGuardRegion]
]) {
  assert.doesNotMatch(
    region,
    /clearBasketExecution|routeExecutionOrderByMode|markExecutionOrderFilled|settlePracticeExecutionOrder|saveBasketExecution|updateExecutionOrder/,
    `${name} active guard must not acquire OMS routing/fill/clear authority`
  );
}

console.log(
  "PASS PC-031B4M7C5D7F5H2 canonical active execution caller UX contract"
);
console.log(
  "PASS Coach G uses canonical isActiveOrder() before saveTradeBasket()"
);
console.log(
  "PASS REAL Trade uses canonical isActiveOrder() before saveTradeBasket()"
);
console.log(
  "PASS blocked callers preserve and expose the existing execution"
);
console.log(
  "PASS D7F5G remains the authoritative forceNew replacement boundary"
);
console.log(
  "PASS caller UX adds no routing/fill/accounting/clear authority"
);
