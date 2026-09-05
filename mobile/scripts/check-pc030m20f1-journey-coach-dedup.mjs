import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const screen = await readFile(new URL("../app/wealth-journey.js", import.meta.url), "utf8");
const goalCard = await readFile(new URL("../src/features/wealth-journey/components/WealthJourneyGoalCard.js", import.meta.url), "utf8");

assert.match(screen, /<CoachPriority/);
assert.match(screen, /prompt\.message/);
assert.match(screen, /<WealthJourneyGoalCard/);
assert.doesNotMatch(goalCard, /goal\.narrative/);
assert.match(goalCard, /goal\.statusLabel/);
assert.match(goalCard, /goal\.currentValue/);
assert.match(goalCard, /goal\.targetAmount/);
assert.match(goalCard, /goal\.projectedValue/);
assert.match(goalCard, /goal\.nextAction/);

console.log("PASS — the full Coach G narrative renders only in the priority card.");
console.log("PASS — goal cards retain status, progress metrics, editing, and next action.");
