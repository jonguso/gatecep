import fs from "node:fs";

const file = "mobile/app/trade.js";
let source = fs.readFileSync(file, "utf8");
const original = source;

const estimateStart =
`      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {averageCostMode ? "Scenario Estimate" : "Trade Estimate"}`;

const impactStart =
`      {averageCostMode ? (
        <Pressable
          style={styles.impactReviewButton}`;

const coachStart =
`      {averageGuard ? (
        <View`;

const modalStart =
`      <Modal
        visible={projectedImpactOpen}`;

const checkpointStart =
`        <View style={styles.previewOnly}>`;

function requireOnce(label, marker) {
  const count = source.split(marker).length - 1;

  if (count !== 1) {
    throw new Error(
      `${label}: expected exactly one match, found ${count}`
    );
  }

  return source.indexOf(marker);
}

const estimateIndex = requireOnce(
  "Scenario Estimate opening",
  estimateStart
);

const impactIndex = requireOnce(
  "Projected Impact opening",
  impactStart
);

const coachIndex = requireOnce(
  "Coach G opening",
  coachStart
);

const modalIndex = requireOnce(
  "Projected Impact modal opening",
  modalStart
);

if (
  !(
    estimateIndex <
    impactIndex &&
    impactIndex <
    coachIndex &&
    coachIndex <
    modalIndex
  )
) {
  throw new Error(
    "Trade decision sections are not in expected order."
  );
}

/*
 * Wrap the existing Estimate + Impact button + Coach G blocks.
 *
 * We do not duplicate or alter any calculations.
 * Compact/native and Practice remain visually sequential because
 * terminalDecisionGridWide is applied only when wideWeb &&
 * averageCostMode.
 */

source =
  source.slice(0, estimateIndex) +
`      <View
        style={
          wideWeb && averageCostMode
            ? styles.terminalDecisionGrid
            : null
        }
      >
        <View
          style={
            wideWeb && averageCostMode
              ? styles.terminalDecisionColumn
              : null
          }
        >
          {wideWeb && averageCostMode ? (
            <Text style={styles.terminalSectionEyebrow}>
              PROJECTED TRADE
            </Text>
          ) : null}
` +
  source.slice(estimateIndex, coachIndex) +
`        </View>

        <View
          style={
            wideWeb && averageCostMode
              ? styles.terminalDecisionColumn
              : null
          }
        >
          {wideWeb && averageCostMode ? (
            <Text style={styles.terminalSectionEyebrow}>
              COACH G
            </Text>
          ) : null}
` +
  source.slice(coachIndex, modalIndex) +
`        </View>
      </View>

` +
  source.slice(modalIndex);

/*
 * Wide-web label only. Existing modal and handler stay unchanged.
 */

const oldImpactLabel =
`          <Text style={styles.primaryText}>View Projected Impact</Text>`;

const newImpactLabel =
`          <Text style={styles.primaryText}>
            {wideWeb && averageCostMode
              ? "View Full Projected Impact"
              : "View Projected Impact"}
          </Text>`;

const impactLabelCount =
  source.split(oldImpactLabel).length - 1;

if (impactLabelCount !== 1) {
  throw new Error(
    `Projected Impact label: expected 1, found ${impactLabelCount}`
  );
}

source = source.replace(
  oldImpactLabel,
  newImpactLabel
);

/*
 * Add checkpoint hierarchy without changing handlers.
 */

const checkpointCount =
  source.split(checkpointStart).length - 1;

if (checkpointCount !== 1) {
  throw new Error(
    `Decision checkpoint: expected 1, found ${checkpointCount}`
  );
}

source = source.replace(
  checkpointStart,
`        <View
          style={[
            styles.previewOnly,
            wideWeb && styles.terminalReviewCheckpoint
          ]}
        >
          {wideWeb ? (
            <Text style={styles.terminalSectionEyebrow}>
              DECISION CHECKPOINT
            </Text>
          ) : null}`
);

/*
 * Add only one presentation style.
 */

const styleAnchor =
`  terminalDecisionColumn: {
    flex: 1,
    minWidth: 0
  },`;

const styleCount =
  source.split(styleAnchor).length - 1;

if (styleCount !== 1) {
  throw new Error(
    `terminalDecisionColumn style: expected 1, found ${styleCount}`
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
  "PASS: PC-032G4A2B2 wide-web decision workspace applied."
);
