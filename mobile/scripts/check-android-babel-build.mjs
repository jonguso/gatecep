import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

assert.match(
  packageJson.dependencies?.["babel-preset-expo"] || "",
  /^~54\.0\.12$/,
  "babel-preset-expo must be an explicit Expo SDK 54 runtime dependency"
);

const presetPath = require.resolve("babel-preset-expo");
assert.ok(presetPath, "babel-preset-expo must resolve from the mobile project root");

console.log("PASS — babel-preset-expo is explicitly declared for Expo SDK 54.");
console.log("PASS — Babel resolves the preset from the mobile project root used by EAS.");
