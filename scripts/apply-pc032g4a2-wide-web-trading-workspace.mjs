import fs from "node:fs";

const file = "mobile/app/trade.js";
let source = fs.readFileSync(file, "utf8");

const original = source;

function replaceOnce(label, before, after) {
  const count = source.split(before).length - 1;

  if (count !== 1) {
    throw new Error(
      `${label}: expected exactly one match, found ${count}`
    );
  }

  source = source.replace(before, after);
}

/*
 * G4A2 is presentation-only.
 *
 * We deliberately do NOT move or replace:
 * - buildEstimate
 * - projectedImpact calculation
 * - averageGuard calculation
 * - goalRiskImpact calculation
 * - proceedRealOrderToReview
 * - addToBrokerActionPlan
 * - Practice execution
 *
 * The patch only introduces wide-web grouping around the
 * already-rendered estimate / impact / Coach G / checkpoint.
 */

replaceOnce(
  "open wide-web decision workspace",
`      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {averageCostMode ? "Scenario Estimate" : "Trade Estimate"}
        </Text>`,
`      {wideWeb && averageCostMode ? (
        <View style={styles.terminalDecisionGrid}>
          <View style={styles.terminalDecisionColumn}>
            <Text style={styles.terminalSectionEyebrow}>
              PROJECTED PORTFOLIO IMPACT
            </Text>
          </View>
          <View style={styles.terminalDecisionColumn}>
            <Text style={styles.terminalSectionEyebrow}>
              COACH G
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {averageCostMode ? "Scenario Estimate" : "Trade Estimate"}
        </Text>`
);

replaceOnce(
  "wide-web impact button label",
`          <Text style={styles.primaryText}>View Projected Impact</Text>`,
`          <Text style={styles.primaryText}>
            {wideWeb ? "View Full Projected Impact" : "View Projected Impact"}
          </Text>`
);

replaceOnce(
  "wide-web decision checkpoint eyebrow",
`        <View style={styles.previewOnly}>
          <Text style={styles.previewOnlyTitle}>
            Decision Preview — No REAL Trade Executed
          </Text>`,
`        <View style={[
          styles.previewOnly,
          wideWeb && styles.terminalReviewCheckpoint
        ]}>
          {wideWeb ? (
            <Text style={styles.terminalSectionEyebrow}>
              DECISION CHECKPOINT
            </Text>
          ) : null}
          <Text style={styles.previewOnlyTitle}>
            Decision Preview — No REAL Trade Executed
          </Text>`
);

const styleAnchor =
`  terminalDecisionColumn: {
    flex: 1,
    minWidth: 0
  },`;

if (!source.includes(styleAnchor)) {
  throw new Error(
    "terminalDecisionColumn style anchor not found"
  );
}

source = source.replace(
  styleAnchor,
`${styleAnchor}

  terminalReviewCheckpoint: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    backgroundColor: "#0f172a",
    padding: 18
  },`
);

if (source === original) {
  throw new Error("No changes produced.");
}

fs.writeFileSync(file, source);

console.log(
  "PASS: PC-032G4A2 wide-web trading workspace composition applied."
);
