import fs from "node:fs";
import assert from "node:assert/strict";

const s = fs.readFileSync("app/goal-scenario-planner.js", "utf8");

assert.ok(
  /av3bTitleNarrow\s*:\s*\{[\s\S]*?lineHeight\s*:\s*31\s*\}\s*,\s*av3bInputGrid\s*:/.test(s),
  "missing comma between av3bTitleNarrow and av3bInputGrid"
);

assert.ok(s.includes("av3bInputGrid"));
assert.ok(s.includes("av3bField"));
assert.ok(s.includes("av3bSectorRowNarrow"));
assert.ok(s.includes('pathname: "/goal-recovery-choice"'));
assert.ok(s.includes("buildGoalDiversificationScenario"));
assert.ok(s.includes("useWindowDimensions"));

console.log("PASS — responsive style object separator is valid.");
console.log("PASS — AV3B planner responsive styles remain present.");
console.log("PASS — goal scenario engine and recovery handoff remain present.");
console.log("PC-030M20AV3B2 verification complete.");
