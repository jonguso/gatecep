#!/usr/bin/env bash
set -euo pipefail

echo "PC-030M20AR9B — M20AR4 Integrity Export Regression Correction"
echo "NO APP CODE CHANGED — verification contract only."

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cat > mobile/scripts/test-pc030m20ar4-investor-facing-dialogue.mjs <<'EOF'
import assert from "node:assert/strict";
import {
  normalizeDecisionEntryContext,
  buildEntryDialogue,
  summarizeInvestorTurn,
  buildAccommodationDialogue,
  buildAlternativeDialogue,
  DECISION_DIALOGUE_INTEGRITY
} from "../src/features/trading/coachGDecisionDialogueService.js";

const recovery=normalizeDecisionEntryContext({
  decisionSource:"COACH_G_RECOVERY",
  goalName:"Family Security",
  goalGap:"21750.51",
  largestSector:"Banking"
});
assert.equal(recovery.source,"COACH_G_RECOVERY");
assert.equal(recovery.hasRecoveryContext,true);
assert.match(buildEntryDialogue(recovery).text,/Family Security/);
assert.match(buildEntryDialogue(recovery).text,/rather than starting over/);
console.log("PASS — recovery recommendations arrive as continuing conversation context instead of a fresh form.");

const investor=summarizeInvestorTurn({
  action:"BUY",
  security:"COOP",
  amount:50000,
  investorReason:"FRIEND_OR_MARKET_IDEA",
  decisionPriority:"DIVERSIFICATION"
});
assert.match(investor,/COOP/);
assert.match(investor,/50,000/);
assert.match(investor,/DIVERSIFICATION/i);
console.log("PASS — investor intent can be reflected back as a conversation turn while preserving the scenario contract.");

const accommodation={
  symbol:"COOP",
  sector:"Banking",
  concentrationIncreases:true,
  sectorImpact:{currentSectorWeight:37.7,projectedSectorWeight:42.5},
  rotationCandidates:[{symbol:"KCB"}],
  underweightEvidenceAvailable:false
};
const follow=buildAccommodationDialogue(accommodation);
assert.match(follow.question,/accommodate COOP/i);
assert.match(follow.text,/37.7%/);
assert.match(follow.text,/42.5%/);
const alt=buildAlternativeDialogue(accommodation);
assert.match(alt.text,/will not invent an underweight sector/i);
console.log("PASS — Coach G explains the BUY concern, asks a follow-up question and keeps evidence boundaries explicit.");

assert.equal(DECISION_DIALOGUE_INTEGRITY.advisoryOnly,true);
assert.equal(DECISION_DIALOGUE_INTEGRITY.mutatesRealPortfolio,false);
assert.equal(DECISION_DIALOGUE_INTEGRITY.mutatesPracticePortfolio,false);
assert.equal(DECISION_DIALOGUE_INTEGRITY.mutatesInvestorDNA,false);
assert.equal(DECISION_DIALOGUE_INTEGRITY.retainsConversationContext,true);
if (Object.prototype.hasOwnProperty.call(DECISION_DIALOGUE_INTEGRITY,"actionAware")) {
  assert.equal(DECISION_DIALOGUE_INTEGRITY.actionAware,true);
}
console.log("PASS — dialogue state remains advisory-only and accepts additive M20AR9 action-aware metadata.");
EOF

echo "UPDATED — M20AR4 regression now validates the actual DECISION_DIALOGUE_INTEGRITY export."
echo "PRESERVED — all original M20AR4 functional checks remain present."
echo "PC-030M20AR9B applied successfully."
