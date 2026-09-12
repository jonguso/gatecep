import fs from "node:fs";
import assert from "node:assert/strict";

const s = fs.readFileSync("app/menu.js", "utf8");

assert.ok(s.includes('title: "Holdings"'));
assert.ok(s.includes('route: "/holding-details"'));
assert.ok(s.includes('title: "Portfolio Rebalancing"'));
assert.ok(s.includes('route: "/portfolio-rebalancing"'));

const objectExpanded =
  /primary\s*:\s*true/i.test(s) ||
  /["']Primary["']\s*:\s*true/.test(s);

const scalarExpanded =
  /useState\(\s*["']primary["']\s*\)/i.test(s);

const arrayExpanded =
  /useState\(\s*\[\s*["']primary["']\s*\]\s*\)/i.test(s);

assert.equal(objectExpanded, false);
assert.equal(scalarExpanded, false);
assert.equal(arrayExpanded, false);

console.log("PASS — Primary is not initialized expanded.");
console.log("PASS — Holdings and Portfolio Rebalancing menu routes remain present.");
console.log("PASS — menu navigation content is preserved.");
console.log("PC-030M20AV3A verification complete.");
