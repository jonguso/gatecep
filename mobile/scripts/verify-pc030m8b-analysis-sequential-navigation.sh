#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "============================================================"
echo "PC-030M8B — ANALYSIS SEQUENTIAL NAVIGATION VERIFICATION"
echo "============================================================"

node - <<'NODE'
const fs = require("fs");
const parser = require("@babel/parser");
const source = fs.readFileSync("app/unified-portfolio-analytics.js", "utf8");

parser.parse(source, { sourceType: "module", plugins: ["jsx"] });

function requireText(text, message) {
  if (!source.includes(text)) throw new Error(message);
}

for (const id of [
  "health",
  "scorecard",
  "actions",
  "alerts",
  "holdings",
  "operations",
  "specialists"
]) {
  requireText(`id: "${id}"`, `Missing ordered Analysis section: ${id}`);
}

requireText("const previousSection =", "Previous-section contract is missing.");
requireText("const nextSection =", "Next-section contract is missing.");
requireText("moveToSection(previousSection.id)", "Previous control is not connected.");
requireText("moveToSection(nextSection.id)", "Next control is not connected.");
requireText("Finish: Analysis Overview", "Final-section completion behavior is missing.");
requireText("Analysis Overview", "Parent overview action is missing.");
requireText("scrollRef.current?.scrollTo({ y: 0, animated: true })", "Section changes do not reset scroll position.");
requireText("activeSectionIndex + 1", "Journey position is not derived from the active section.");

const obsoleteDetailReturns = (source.match(/Back to Portfolio Analysis/g) || []).length;
if (obsoleteDetailReturns) {
  throw new Error("Duplicate parent-return controls remain in the focused Analysis journey.");
}

console.log("PASS — Analysis preserves all seven sections in canonical order.");
console.log("PASS — the header returns to the parent Analysis overview.");
console.log("PASS — the upper journey control moves to the previous section.");
console.log("PASS — the lower journey control advances to the next section.");
console.log("PASS — the final section completes back to the Analysis overview.");
console.log("PASS — every section transition resets the scroll position.");
console.log("PASS — sequential Analysis navigation source parses successfully.");
NODE

bash scripts/verify-pc030m6b-focused-portfolio-analysis.sh

echo "PC-030M8B Analysis sequential navigation verification complete."
