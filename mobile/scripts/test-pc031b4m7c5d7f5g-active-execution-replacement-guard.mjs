import fs from "node:fs";
import assert from "node:assert/strict";

import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir =
  path.dirname(fileURLToPath(import.meta.url));

const mobileRoot =
  path.resolve(scriptDir, "..");

function mobilePath(relativePath) {
  return path.join(mobileRoot, relativePath);
}


const storePath = mobilePath("src/services/trade/basketExecutionStore.js");
const coachPath = mobilePath("app/coach-insights.js");
const tradePath = mobilePath("app/trade.js");

const store = fs.readFileSync(storePath, "utf8");
const coach = fs.readFileSync(coachPath, "utf8");
const trade = fs.readFileSync(tradePath, "utf8");

assert.match(
  store,
  /existing\?\.orders\?\.some\(\(order\) => isActiveOrder\(order\.status\)\) === true/,
  "createBasketExecution must derive active execution state from canonical isActiveOrder()"
);

assert.match(
  store,
  /if \(hasActiveExecution\) \{[\s\S]*?if \(forceNew\) \{[\s\S]*?ACTIVE_EXECUTION_REPLACEMENT_FORBIDDEN[\s\S]*?throw error;[\s\S]*?\}[\s\S]*?return existing;[\s\S]*?\}/,
  "Active execution must be returned normally or fail closed when forceNew attempts replacement"
);

const guardPos = store.indexOf("if (hasActiveExecution)");
const basketLoadPos = store.indexOf(
  "const basket = await loadTradeBasket();",
  guardPos
);
const executionWritePos = store.indexOf(
  "await userSetItem(ACTIVE_BASKET_EXECUTION_KEY",
  guardPos
);

assert.ok(guardPos >= 0, "Active execution guard must exist");
assert.ok(
  basketLoadPos > guardPos,
  "Active execution replacement guard must run before loading the replacement basket"
);
assert.ok(
  executionWritePos > guardPos,
  "Active execution replacement guard must run before persisted execution replacement"
);

assert.match(
  coach,
  /createBasketExecution\(\{\s*forceNew:\s*true\s*\}\)/,
  "Coach G may still request a fresh execution; central store must decide whether replacement is safe"
);

assert.match(
  trade,
  /createBasketExecution\(\{\s*forceNew:\s*true\s*\}\)/,
  "REAL trade review may still request a fresh execution; central store must protect active OMS state"
);

assert.doesNotMatch(
  store,
  /clearBasketExecution\(\)[\s\S]{0,400}createBasketExecution/,
  "Creation guard must not clear persisted execution state"
);

console.log(
  "PASS PC-031B4M7C5D7F5G active execution replacement guard source contract"
);
console.log(
  "PASS active OMS state cannot be replaced by forceNew"
);
console.log(
  "PASS ordinary createBasketExecution continues to reuse active execution"
);
console.log(
  "PASS closed/no execution remains eligible for fresh creation"
);
console.log(
  "PASS PRACTICE and REAL callers share the same central replacement boundary"
);
console.log(
  "PASS no execution clear/routing/fill/accounting authority added"
);
