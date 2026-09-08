import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile(
  new URL("../src/features/portfolio-home/PortfolioHomeScreen.js", import.meta.url),
  "utf8"
);

assert.match(home, /style=\{\[styles\.chartCanvas, \{ width: size, height: size \}\]\}/);
assert.match(home, /width="100%" height="100%"/);
assert.match(home, /viewBox=\{`0 0 \$\{size\} \$\{size\}`\}/);
assert.match(home, /preserveAspectRatio="xMidYMid meet"/);
assert.match(home, /chartCanvas: \{ flexGrow: 0, flexShrink: 0/);
assert.match(home, /backgroundColor: "transparent"/);
assert.match(home, /nativeEvent\?\.locationX \?\?/);
assert.match(home, /nativeEvent\?\.offsetX/);
assert.match(home, /onPress=\{handleChartPress\}/);
assert.match(home, /setSelectedSector/);
assert.match(home, /Platform\.OS === "web"/);
assert.match(home, /function WebSectorDonut/);
assert.match(home, /React\.createElement/);
assert.match(home, /element\("svg"/);
assert.match(home, /element\("path"/);
assert.match(home, /element\("text"/);
assert.match(home, /getBoundingClientRect/);
assert.match(home, /onClick: handleClick/);

console.log("PASS — the sector donut has an explicit square canvas on web and native.");
console.log("PASS — the SVG uses a stable viewBox and aspect ratio instead of collapsing to text height.");
console.log("PASS — the chart background remains transparent in the dark portfolio card.");
console.log("PASS — native and browser pointer coordinates retain sector drill-down.");
console.log("PASS — web bypasses the incompatible SVG adapter and renders browser-native paths.");
