#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "============================================================"
echo "PC-030M8A — ALIGNED GLOBAL MENU VERIFICATION"
echo "============================================================"

node - <<'NODE'
const fs = require("fs");
const parser = require("@babel/parser");

const files = [
  "app/menu.js",
  "app/_layout.js",
  "src/components/navigation/AppMenuButton.js"
];

for (const file of files) {
  parser.parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    plugins: ["jsx"]
  });
}

const menu = fs.readFileSync("app/menu.js", "utf8");
const layout = fs.readFileSync("app/_layout.js", "utf8");
const globalButton = fs.readFileSync(
  "src/components/navigation/AppMenuButton.js",
  "utf8"
);

function requireText(source, value, message) {
  if (!source.includes(value)) throw new Error(message);
}

for (const section of [
  "Primary",
  "Portfolio",
  "Connect & Reconcile",
  "Journey & Account"
]) {
  requireText(menu, `title: "${section}"`, `Missing menu section: ${section}`);
}

requireText(menu, "CollapsibleSection", "Menu does not use progressive disclosure.");
requireText(menu, "onBack={() => router.back()}", "Menu cannot return to its invoking page.");
requireText(menu, 'actionLabel="Home"', "Menu is missing its canonical Home action.");
requireText(layout, "<AppMenuButton />", "Authenticated shell does not expose the global menu control.");
requireText(globalButton, 'onPress={() => router.push("/menu")}', "Global menu route is not connected.");
requireText(globalButton, '"/login"', "Login exclusion is missing.");
requireText(globalButton, '"/register"', "Register exclusion is missing.");
requireText(globalButton, 'path.startsWith("/onboarding")', "Onboarding exclusion is missing.");
requireText(globalButton, '"/menu"', "Menu self-exclusion is missing.");
requireText(globalButton, '"/(tabs)/dashboard"', "Duplicate Home menu exclusion is missing.");

if (/Practice Demo|Practice Portfolio|Sandbox/.test(menu)) {
  throw new Error("Production menu must not promote Practice or Sandbox as a REAL destination.");
}

console.log("PASS — Menu is grouped around the canonical investor architecture.");
console.log("PASS — compact sections replace the previous endless flat list.");
console.log("PASS — authenticated detail pages expose one shared Menu control.");
console.log("PASS — authentication, onboarding, Menu, and Home duplicate states are excluded.");
console.log("PASS — Back and Home return paths are explicit.");
console.log("PASS — global menu source parses successfully.");
NODE

python scripts/audit-pc029c-visible-routes.py

echo "PC-030M8A aligned global menu verification complete."
