import {
  GOAL_BEHAVIOR_HYPOTHESIS_TYPES,
  buildGoalBehaviorAlignmentAnalysis
} from "./goalBehaviorAlignmentEngine";

/*
 * ============================================================
 * PC-028D
 * INVESTOR DNA EVIDENCE UPDATE ENGINE
 * ============================================================
 *
 * GateCEP purpose:
 *
 * Convert observed behavior + goal alignment + Coach G clarification
 * into confidence-weighted Investor DNA evidence.
 *
 * Important:
 * - observation is evidence, not truth
 * - a proposed DNA change is not automatically applied
 * - Coach G clarification can strengthen, weaken, defer, or reject
 *   a hypothesis
 * - conflicting evidence is preserved
 * - the investor's current circumstances can legitimately change DNA
 * ============================================================
 */

export const INVESTOR_DNA_EVIDENCE_TYPES = Object.freeze({
  OBSERVED_BEHAVIOR: "OBSERVED_BEHAVIOR",
  COACH_G_CONVERSATION: "COACH_G_CONVERSATION",
  GOAL_CONTEXT: "GOAL_CONTEXT",
  PORTFOLIO_CONTEXT: "PORTFOLIO_CONTEXT",
  PRACTICE_BEHAVIOR: "PRACTICE_BEHAVIOR",
  LIFE_EVENT: "LIFE_EVENT",
  INVESTOR_CONFIRMATION: "INVESTOR_CONFIRMATION"
});

export const INVESTOR_DNA_EVIDENCE_STATUSES = Object.freeze({
  PROPOSED: "PROPOSED",
  NEEDS_CLARIFICATION: "NEEDS_CLARIFICATION",
  CONFIRMED: "CONFIRMED",
  DEFERRED: "DEFERRED",
  REJECTED: "REJECTED",
  SUPERSEDED: "SUPERSEDED"
});

export const INVESTOR_DNA_UPDATE_DECISIONS = Object.freeze({
  CONFIRM: "CONFIRM",
  DEFER: "DEFER",
  REJECT: "REJECT",
  KEEP_CURRENT: "KEEP_CURRENT"
});

export const INVESTOR_DNA_TRAITS = Object.freeze({
  INVESTMENT_STYLE: "INVESTMENT_STYLE",
  CONTRIBUTION_DISCIPLINE: "CONTRIBUTION_DISCIPLINE",
  LOSS_SENSITIVITY: "LOSS_SENSITIVITY",
  LIQUIDITY_SENSITIVITY: "LIQUIDITY_SENSITIVITY",
  CONCENTRATION_TENDENCY: "CONCENTRATION_TENDENCY",
  HOLDING_PERIOD_TENDENCY: "HOLDING_PERIOD_TENDENCY",
  TRADING_ACTIVITY: "TRADING_ACTIVITY",
  GOAL_COMMITMENT: "GOAL_COMMITMENT",
  DECISION_DISCIPLINE: "DECISION_DISCIPLINE"
});

function n(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function round(value, decimals = 0) {
  const parsed = n(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(decimals)
      );
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function nowIso() {
  return new Date().toISOString();
}

function createEvidenceId(prefix = "DNAE") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function confidenceFromSignal(signal = {}) {
  const signalScore =
    n(signal?.score);

  const base =
    signal?.confidence === "HIGH"
      ? 80
      : signal?.confidence === "LOW"
        ? 45
        : 65;

  if (signalScore === null) {
    return base;
  }

  const distanceFromNeutral =
    Math.abs(
      signalScore - 70
    );

  return clamp(
    round(
      base +
      Math.min(
        distanceFromNeutral * 0.35,
        15
      ),
      0
    ),
    0,
    100
  );
}

function signalToTraitProposal(
  signal = {}
) {
  const score =
    n(signal?.score);

  switch (
    signal?.type
  ) {
    case "CONTRIBUTION_CONSISTENCY":
      return {
        trait:
          INVESTOR_DNA_TRAITS
            .CONTRIBUTION_DISCIPLINE,

        proposedValue:
          score !== null &&
          score >= 75
            ? "CONSISTENT"
            : score !== null &&
              score < 55
              ? "INCONSISTENT"
              : "MIXED"
      };

    case "TRADING_FREQUENCY":
      return {
        trait:
          INVESTOR_DNA_TRAITS
            .TRADING_ACTIVITY,

        proposedValue:
          score !== null &&
          score < 55
            ? "ACTIVE"
            : score !== null &&
              score >= 80
              ? "LOW_ACTIVITY"
              : "MODERATE"
      };

    case "HOLDING_PERIOD":
      return {
        trait:
          INVESTOR_DNA_TRAITS
            .HOLDING_PERIOD_TENDENCY,

        proposedValue:
          score !== null &&
          score < 55
            ? "SHORTER_TERM"
            : score !== null &&
              score >= 80
              ? "LONGER_TERM"
              : "MIXED"
      };

    case "CONCENTRATION":
      return {
        trait:
          INVESTOR_DNA_TRAITS
            .CONCENTRATION_TENDENCY,

        proposedValue:
          score !== null &&
          score < 55
            ? "CONCENTRATED"
            : score !== null &&
              score >= 80
              ? "DIVERSIFIED"
              : "MIXED"
      };

    case "CASH_USAGE":
      return {
        trait:
          INVESTOR_DNA_TRAITS
            .LIQUIDITY_SENSITIVITY,

        proposedValue:
          score !== null &&
          score < 55
            ? "HIGH"
            : score !== null &&
              score >= 80
              ? "LOW"
              : "MODERATE"
      };

    case "LOSS_RESPONSE":
      return {
        trait:
          INVESTOR_DNA_TRAITS
            .LOSS_SENSITIVITY,

        proposedValue:
          score !== null &&
          score < 55
            ? "HIGH"
            : score !== null &&
              score >= 80
              ? "LOW"
              : "MODERATE"
      };

    case "PORTFOLIO_DRIFT":
      return {
        trait:
          INVESTOR_DNA_TRAITS
            .DECISION_DISCIPLINE,

        proposedValue:
          score !== null &&
          score < 55
            ? "NEEDS_REVIEW"
            : score !== null &&
              score >= 80
              ? "DISCIPLINED"
              : "MIXED"
      };

    default:
      return null;
  }
}

export function buildInvestorDNAEvidenceFromAlignment({
  alignmentAnalysis,
  source = {},
  investorDNA = {}
} = {}) {
  const signals =
    safeArray(
      alignmentAnalysis
        ?.signals
    );

  return signals
    .map(
      (signal) => {
        const proposal =
          signalToTraitProposal(
            signal
          );

        if (!proposal) {
          return null;
        }

        const currentValue =
          investorDNA?.[
            proposal.trait
          ] ??
          investorDNA?.[
            proposal.trait
              .toLowerCase()
          ] ??
          null;

        const confidence =
          confidenceFromSignal(
            signal
          );

        const differsFromCurrent =
          currentValue !== null &&
          String(currentValue) !==
          String(
            proposal
              .proposedValue
          );

        return {
          id:
            createEvidenceId(),

          createdAt:
            nowIso(),

          evidenceType:
            INVESTOR_DNA_EVIDENCE_TYPES
              .OBSERVED_BEHAVIOR,

          status:
            differsFromCurrent
              ? INVESTOR_DNA_EVIDENCE_STATUSES
                  .NEEDS_CLARIFICATION
              : INVESTOR_DNA_EVIDENCE_STATUSES
                  .PROPOSED,

          trait:
            proposal.trait,

          currentValue,

          proposedValue:
            proposal
              .proposedValue,

          confidence,

          evidence: [
            ...safeArray(
              signal
                ?.evidence
            )
          ],

          signal: {
            type:
              signal
                ?.type ||
              null,

            score:
              signal
                ?.score ??
              null,

            interpretation:
              signal
                ?.interpretation ||
              null
          },

          source: {
            goalId:
              alignmentAnalysis
                ?.goal
                ?.id ||
              null,

            goalName:
              alignmentAnalysis
                ?.goal
                ?.name ||
              null,

            sourceType:
              source?.sourceType ||
              "GOAL_BEHAVIOR_ALIGNMENT",

            sourceReference:
              source?.sourceReference ||
              null
          },

          clarification: {
            required:
              differsFromCurrent ||
              confidence < 75,

            question:
              null,

            response:
              null,

            resolvedAt:
              null
          },

          decision: {
            value:
              null,

            reason:
              null,

            decidedAt:
              null
          }
        };
      }
    )
    .filter(Boolean);
}

export function attachCoachGClarificationToEvidence({
  evidence,
  question,
  response = null
} = {}) {
  if (!evidence?.id) {
    return {
      success:
        false,

      error:
        "DNA_EVIDENCE_REQUIRED"
    };
  }

  return {
    success:
      true,

    evidence: {
      ...evidence,

      status:
        response
          ? evidence.status
          : INVESTOR_DNA_EVIDENCE_STATUSES
              .NEEDS_CLARIFICATION,

      clarification: {
        ...(evidence
          ?.clarification ||
        {}),

        required:
          !response,

        question:
          question ||
          evidence
            ?.clarification
            ?.question ||
          null,

        response:
          response ||
          null,

        resolvedAt:
          response
            ? nowIso()
            : null
      }
    }
  };
}

export function resolveInvestorDNAEvidence({
  evidence,
  decision,
  reason = null,
  confidenceAdjustment = 0
} = {}) {
  if (!evidence?.id) {
    return {
      success:
        false,

      error:
        "DNA_EVIDENCE_REQUIRED"
    };
  }

  if (
    !Object.values(
      INVESTOR_DNA_UPDATE_DECISIONS
    ).includes(
      decision
    )
  ) {
    return {
      success:
        false,

      error:
        "VALID_DNA_UPDATE_DECISION_REQUIRED"
    };
  }

  const statusMap = {
    [INVESTOR_DNA_UPDATE_DECISIONS.CONFIRM]:
      INVESTOR_DNA_EVIDENCE_STATUSES.CONFIRMED,

    [INVESTOR_DNA_UPDATE_DECISIONS.DEFER]:
      INVESTOR_DNA_EVIDENCE_STATUSES.DEFERRED,

    [INVESTOR_DNA_UPDATE_DECISIONS.REJECT]:
      INVESTOR_DNA_EVIDENCE_STATUSES.REJECTED,

    [INVESTOR_DNA_UPDATE_DECISIONS.KEEP_CURRENT]:
      INVESTOR_DNA_EVIDENCE_STATUSES.REJECTED
  };

  const adjustedConfidence =
    clamp(
      (
        n(
          evidence
            ?.confidence
        ) ||
        0
      ) +
      (
        n(
          confidenceAdjustment
        ) ||
        0
      ),
      0,
      100
    );

  return {
    success:
      true,

    evidence: {
      ...evidence,

      status:
        statusMap[
          decision
        ],

      confidence:
        round(
          adjustedConfidence,
          0
        ),

      clarification: {
        ...(evidence
          ?.clarification ||
        {}),

        required:
          false,

        resolvedAt:
          evidence
            ?.clarification
            ?.resolvedAt ||
          nowIso()
      },

      decision: {
        value:
          decision,

        reason:
          reason ||
          null,

        decidedAt:
          nowIso()
      }
    }
  };
}

export function buildInvestorDNAUpdateProposal({
  currentDNA = {},
  evidence = []
} = {}) {
  const grouped = {};

  safeArray(evidence)
    .filter(
      (item) =>
        item?.status ===
        INVESTOR_DNA_EVIDENCE_STATUSES
          .CONFIRMED
    )
    .forEach(
      (item) => {
        if (!grouped[item.trait]) {
          grouped[item.trait] = [];
        }

        grouped[item.trait].push(
          item
        );
      }
    );

  const updates = [];

  Object.entries(
    grouped
  ).forEach(
    (
      [
        trait,
        items
      ]
    ) => {
      const byValue = {};

      items.forEach(
        (item) => {
          const key =
            String(
              item
                .proposedValue
            );

          if (!byValue[key]) {
            byValue[key] = {
              value:
                item
                  .proposedValue,

              confidenceTotal:
                0,

              count:
                0,

              evidenceIds:
                []
            };
          }

          byValue[key]
            .confidenceTotal +=
            n(
              item
                ?.confidence
            ) ||
            0;

          byValue[key]
            .count +=
            1;

          byValue[key]
            .evidenceIds
            .push(
              item.id
            );
        }
      );

      const ranked =
        Object.values(
          byValue
        )
          .map(
            (item) => ({
              ...item,

              averageConfidence:
                item.count > 0
                  ? item
                      .confidenceTotal /
                    item
                      .count
                  : 0
            })
          )
          .sort(
            (
              first,
              second
            ) =>
              second
                .averageConfidence -
              first
                .averageConfidence
          );

      const winner =
        ranked[0];

      if (!winner) {
        return;
      }

      const currentValue =
        currentDNA?.[trait] ??
        currentDNA?.[
          trait
            .toLowerCase()
        ] ??
        null;

      updates.push({
        trait,

        currentValue,

        proposedValue:
          winner.value,

        confidence:
          round(
            winner
              .averageConfidence,
            0
          ),

        evidenceIds:
          winner
            .evidenceIds,

        conflictingEvidence:
          ranked
            .slice(1)
            .map(
              (item) => ({
                proposedValue:
                  item.value,

                confidence:
                  round(
                    item
                      .averageConfidence,
                    0
                  ),

                evidenceIds:
                  item
                    .evidenceIds
              })
            ),

        updateRecommended:
          String(
            currentValue
          ) !==
          String(
            winner.value
          ) &&
          winner
            .averageConfidence >=
          70
      });
    }
  );

  return {
    generatedAt:
      nowIso(),

    updates,

    updateCount:
      updates.filter(
        (item) =>
          item
            .updateRecommended
      ).length,

    safeguards: {
      automaticallyApplied:
        false,

      conflictingEvidencePreserved:
        true,

      confirmationRequired:
        true
    }
  };
}

export function applyConfirmedInvestorDNAUpdates({
  currentDNA = {},
  proposal,
  approvedTraits = []
} = {}) {
  const approved =
    new Set(
      safeArray(
        approvedTraits
      )
    );

  const nextDNA = {
    ...currentDNA
  };

  const applied = [];

  safeArray(
    proposal?.updates
  )
    .filter(
      (item) =>
        item
          ?.updateRecommended &&
        approved.has(
          item.trait
        )
    )
    .forEach(
      (item) => {
        nextDNA[
          item.trait
        ] =
          item
            .proposedValue;

        applied.push({
          trait:
            item.trait,

          previousValue:
            item
              .currentValue,

          nextValue:
            item
              .proposedValue,

          confidence:
            item
              .confidence,

          evidenceIds:
            item
              .evidenceIds
        });
      }
    );

  return {
    nextDNA,

    applied,

    appliedCount:
      applied.length,

    generatedAt:
      nowIso(),

    safeguards: {
      onlyApprovedTraitsApplied:
        true,

      automaticUnapprovedMutation:
        false
    }
  };
}

export function buildInvestorDNAEvidenceReview({
  goal,
  behavior = {},
  portfolioHealth = {},
  investorDNA = {},
  financialContext = {},
  recentLifeChanges = [],
  source = {}
} = {}) {
  const alignmentAnalysis =
    buildGoalBehaviorAlignmentAnalysis({
      goal,
      behavior,
      portfolioHealth,
      investorDNA,
      financialContext,
      recentLifeChanges
    });

  const evidence =
    buildInvestorDNAEvidenceFromAlignment({
      alignmentAnalysis,
      source,
      investorDNA
    });

  const questions =
    safeArray(
      alignmentAnalysis
        ?.coachGQuestions
    );

  const enrichedEvidence =
    evidence.map(
      (
        item,
        index
      ) => ({
        ...item,

        clarification: {
          ...(item
            ?.clarification ||
          {}),

          question:
            questions[index] ||
            questions[0] ||
            null
        }
      })
    );

  return {
    generatedAt:
      nowIso(),

    alignmentAnalysis,

    evidence:
      enrichedEvidence,

    proposedEvidenceCount:
      enrichedEvidence.length,

    needsClarificationCount:
      enrichedEvidence.filter(
        (item) =>
          item
            ?.clarification
            ?.required
      ).length,

    coachGContext: {
      shouldDiscuss:
        enrichedEvidence.some(
          (item) =>
            item
              ?.clarification
              ?.required
        ),

      questions,

      narrative:
        buildInvestorDNAEvidenceNarrative({
          alignmentAnalysis,
          evidence:
            enrichedEvidence
        })
    },

    safeguards: {
      dnaAutomaticallyChanged:
        false,

      observedBehaviorTreatedAsFact:
        false,

      investorContextPreserved:
        true
    }
  };
}

export function buildInvestorDNAEvidenceNarrative({
  alignmentAnalysis,
  evidence = []
} = {}) {
  const count =
    safeArray(evidence).length;

  const clarificationCount =
    safeArray(evidence).filter(
      (item) =>
        item
          ?.clarification
          ?.required
    ).length;

  if (!count) {
    return "GateCEP does not currently have enough new behavioral evidence to propose an Investor DNA update.";
  }

  return `GateCEP found ${count} possible Investor DNA evidence item(s) from recent behavior. ${clarificationCount} require clarification before they should influence the investor profile. These are proposals, not conclusions. Coach G should use conversation and additional evidence before confirming a meaningful DNA change.`;
}

export function buildInvestorDNAEvidenceReviewBatch({
  goals = [],
  ...context
} = {}) {
  return (
    Array.isArray(
      goals
    )
      ? goals
      : []
  ).map(
    (goal) =>
      buildInvestorDNAEvidenceReview({
        goal,
        ...context
      })
  );
}

export function loadInvestorDNAEvidenceNeedingClarification({
  reviews = []
} = {}) {
  return safeArray(
    reviews
  ).flatMap(
    (review) =>
      safeArray(
        review
          ?.evidence
      )
  ).filter(
    (item) =>
      item
        ?.clarification
        ?.required
  );
}
