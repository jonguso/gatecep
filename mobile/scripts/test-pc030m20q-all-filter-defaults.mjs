import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readApp = (name) =>
  readFile(new URL(`../app/${name}`, import.meta.url), "utf8");

const [analytics, risk, rebalancing] = await Promise.all([
  readApp("unified-portfolio-analytics.js"),
  readApp("portfolio-risk.js"),
  readApp("portfolio-rebalancing.js")
]);

assert.match(
  analytics,
  /const \[alertFilter, setAlertFilter\] = useState\("ALL"\)/
);
assert.match(
  analytics,
  /const \[actionFilter, setActionFilter\] = useState\("ALL"\)/
);
assert.match(
  risk,
  /const \[alertFilter, setAlertFilter\] = useState\("ALL"\)/
);
assert.match(
  risk,
  /const \[scenarioFilter, setScenarioFilter\] = useState\("ALL"\)/
);
assert.match(
  rebalancing,
  /recommendationFilter,[\s\S]*?setRecommendationFilter[\s\S]*?\] = useState\("ALL"\)/
);

assert.match(analytics, /calculateResponsivePanelHeight/);
assert.match(risk, /calculateResponsivePanelHeight/);
assert.match(rebalancing, /calculateResponsivePanelHeight/);

console.log("PASS — Portfolio Analysis action and alert lists default to All.");
console.log("PASS — Portfolio Risk alert and stress-test lists default to All.");
console.log("PASS — Rebalancing recommendations default to All.");
console.log("PASS — responsive mobile panel sizing remains enabled.");
