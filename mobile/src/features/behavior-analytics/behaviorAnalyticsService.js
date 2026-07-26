import {
  loadDecisionJournal
} from "../decision-journal/decisionJournalStore";

import {
  loadMonthlyReviews
} from "../monthly-review/monthlyReviewStore";

function average(values = []) {
  const safeValues = values
    .map(Number)
    .filter(Number.isFinite);

  if (!safeValues.length) {
    return 0;
  }

  return (
    safeValues.reduce(
      (sum, value) => sum + value,
      0
    ) / safeValues.length
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function countBy(
  entries = [],
  selector
) {
  const counts = {};

  entries.forEach((entry) => {
    const key =
      selector(entry);

    if (!key) {
      return;
    }

    counts[key] =
      (counts[key] || 0) + 1;
  });

  return counts;
}

function topEntry(
  counts = {}
) {
  const sorted =
    Object.entries(counts)
      .sort(
        (a, b) =>
          b[1] - a[1]
      );

  if (!sorted.length) {
    return null;
  }

  return {
    value:
      sorted[0][0],

    count:
      sorted[0][1]
  };
}

function getMonthKey(value) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

export async function buildBehaviorAnalytics() {
  const [
    journal,
    monthlyReviews
  ] = await Promise.all([
    loadDecisionJournal(),
    loadMonthlyReviews()
  ]);

  const decisions =
    Array.isArray(journal)
      ? journal
      : [];

  const reviews =
    Array.isArray(monthlyReviews)
      ? monthlyReviews
      : [];

  const totalDecisions =
    decisions.length;

  const confidenceValues =
    decisions.map(
      (entry) =>
        Number(
          entry?.confidence ||
          0
        )
    );

  const averageConfidence =
    average(
      confidenceValues
    );

  const reviewedDecisions =
    decisions.filter(
      (entry) =>
        entry?.reviewStatus ===
        "REVIEWED"
    );

  const pendingDecisions =
    decisions.filter(
      (entry) =>
        entry?.reviewStatus !==
        "REVIEWED"
    );

  /*
   * ==========================================================
   * SYMBOL BEHAVIOR
   * ==========================================================
   */

  const symbolCounts =
    countBy(
      decisions,
      (entry) =>
        entry?.symbol
          ? String(
              entry.symbol
            ).toUpperCase()
          : null
    );

  const mostReviewedSymbol =
    topEntry(
      symbolCounts
    );

  /*
   * ==========================================================
   * REASON PATTERNS
   * ==========================================================
   */

  const reasonCounts =
    countBy(
      decisions,
      (entry) =>
        entry?.reason ||
        null
    );

  const mostCommonReason =
    topEntry(
      reasonCounts
    );

  /*
   * ==========================================================
   * EXPECTED OUTCOME PATTERNS
   * ==========================================================
   */

  const outcomeCounts =
    countBy(
      decisions,
      (entry) =>
        entry?.expectedOutcome ||
        null
    );

  const mostCommonOutcome =
    topEntry(
      outcomeCounts
    );

  /*
   * ==========================================================
   * MONTHLY DECISION FREQUENCY
   * ==========================================================
   */

  const monthlyDecisionCounts =
    countBy(
      decisions,
      (entry) =>
        getMonthKey(
          entry?.createdAt
        )
    );

  const decisionFrequency =
    Object.entries(
      monthlyDecisionCounts
    )
      .map(
        ([month, count]) => ({
          month,
          count
        })
      )
      .sort(
        (a, b) =>
          String(
            a.month
          ).localeCompare(
            String(
              b.month
            )
          )
      );

  /*
   * ==========================================================
   * CONFIDENCE TREND
   * ==========================================================
   */

  const confidenceByMonth =
    {};

  decisions.forEach(
    (entry) => {
      const month =
        getMonthKey(
          entry?.createdAt
        );

      if (!month) {
        return;
      }

      if (
        !confidenceByMonth[
          month
        ]
      ) {
        confidenceByMonth[
          month
        ] = [];
      }

      confidenceByMonth[
        month
      ].push(
        Number(
          entry?.confidence ||
          0
        )
      );
    }
  );

  const confidenceTrend =
    Object.entries(
      confidenceByMonth
    )
      .map(
        ([
          month,
          values
        ]) => ({
          month,

          averageConfidence:
            average(
              values
            )
        })
      )
      .sort(
        (a, b) =>
          String(
            a.month
          ).localeCompare(
            String(
              b.month
            )
          )
      );

  /*
   * ==========================================================
   * REPEAT-SECURITY SIGNAL
   * ==========================================================
   */

  const repeatedSymbols =
    Object.entries(
      symbolCounts
    )
      .filter(
        ([, count]) =>
          count > 1
      )
      .map(
        ([
          symbol,
          count
        ]) => ({
          symbol,
          count
        })
      )
      .sort(
        (a, b) =>
          b.count -
          a.count
      );

  /*
   * ==========================================================
   * BEHAVIOR SCORE
   * ==========================================================
   *
   * This is NOT an investment-performance score.
   *
   * It measures process discipline:
   * - recording decisions
   * - giving reasons
   * - setting expectations
   * - recording confidence
   * - reviewing decisions
   */

  const documentedReasonCount =
    decisions.filter(
      (entry) =>
        Boolean(
          normalizeText(
            entry?.reason
          )
        )
    ).length;

  const documentedOutcomeCount =
    decisions.filter(
      (entry) =>
        Boolean(
          normalizeText(
            entry?.expectedOutcome
          )
        )
    ).length;

  const confidenceRecordedCount =
    decisions.filter(
      (entry) =>
        Number(
          entry?.confidence
        ) > 0
    ).length;

  const reviewCompletionRate =
    totalDecisions > 0
      ? reviewedDecisions.length /
        totalDecisions
      : 0;

  const documentationRate =
    totalDecisions > 0
      ? (
          documentedReasonCount +
          documentedOutcomeCount +
          confidenceRecordedCount
        ) /
        (
          totalDecisions *
          3
        )
      : 0;

  const processScore =
    Math.round(
      (
        documentationRate *
          70 +
        reviewCompletionRate *
          30
      )
    );

  /*
   * ==========================================================
   * COACH G ANALYSIS
   * ==========================================================
   */

  const coachG = {
    headline:
      buildHeadline({
        totalDecisions,
        averageConfidence
      }),

    disciplineMessage:
      buildDisciplineMessage({
        totalDecisions,
        documentationRate,
        reviewCompletionRate
      }),

    concentrationMessage:
      buildConcentrationMessage({
        mostReviewedSymbol,
        totalDecisions
      }),

    confidenceMessage:
      buildConfidenceMessage({
        averageConfidence
      }),

    nextFocus:
      buildNextFocus({
        pendingDecisions,
        repeatedSymbols,
        totalDecisions
      })
  };

  return {
    generatedAt:
      new Date().toISOString(),

    summary: {
      totalDecisions,

      averageConfidence,

      reviewedDecisions:
        reviewedDecisions.length,

      pendingDecisions:
        pendingDecisions.length,

      processScore,

      mostReviewedSymbol,

      mostCommonReason,

      mostCommonOutcome
    },

    patterns: {
      symbolCounts,

      reasonCounts,

      outcomeCounts,

      repeatedSymbols,

      decisionFrequency,

      confidenceTrend
    },

    monthlyReviews:
      reviews,

    coachG
  };
}

function buildHeadline({
  totalDecisions,
  averageConfidence
}) {
  if (!totalDecisions) {
    return (
      "You are still building your decision history. " +
      "Coach G needs recorded decisions before meaningful behavior patterns can emerge."
    );
  }

  return (
    `You have recorded ${totalDecisions} ` +
    `${totalDecisions === 1 ? "decision" : "decisions"} ` +
    `with an average confidence of ${averageConfidence.toFixed(
      1
    )}/5.`
  );
}

function buildDisciplineMessage({
  totalDecisions,
  documentationRate,
  reviewCompletionRate
}) {
  if (!totalDecisions) {
    return (
      "Start by documenting why an investment interests you, what you expect from it, and how confident you feel."
    );
  }

  const documentationPercent =
    Math.round(
      documentationRate *
      100
    );

  const reviewPercent =
    Math.round(
      reviewCompletionRate *
      100
    );

  return (
    `You documented ${documentationPercent}% of the core decision fields Coach G tracks. ` +
    `${reviewPercent}% of recorded decisions have been reviewed.`
  );
}

function buildConcentrationMessage({
  mostReviewedSymbol,
  totalDecisions
}) {
  if (
    !mostReviewedSymbol ||
    !totalDecisions
  ) {
    return (
      "No repeated security pattern has emerged yet."
    );
  }

  const share =
    Math.round(
      (
        mostReviewedSymbol.count /
        totalDecisions
      ) *
      100
    );

  return (
    `${mostReviewedSymbol.value} appears in ${share}% of your recorded decisions. ` +
    "Repeated attention can be useful, but Coach G should help you distinguish conviction from over-focus."
  );
}

function buildConfidenceMessage({
  averageConfidence
}) {
  if (
    averageConfidence === 0
  ) {
    return (
      "Confidence has not been recorded yet."
    );
  }

  if (
    averageConfidence >= 4.5
  ) {
    return (
      "Your recorded confidence is very high. Coach G will watch for overconfidence and make sure conviction is supported by clear reasoning."
    );
  }

  if (
    averageConfidence >= 3
  ) {
    return (
      "Your confidence is moderate to strong. Continue documenting the reason behind each decision before acting."
    );
  }

  return (
    "Your confidence is currently cautious. That can be healthy when it leads to better questions and more deliberate decisions."
  );
}

function buildNextFocus({
  pendingDecisions,
  repeatedSymbols,
  totalDecisions
}) {
  if (!totalDecisions) {
    return (
      "Record your first practice investment decision."
    );
  }

  if (
    pendingDecisions.length
  ) {
    return (
      `Review ${pendingDecisions.length} pending ${
        pendingDecisions.length === 1
          ? "decision"
          : "decisions"
      } and compare the original expectation with what actually happened.`
    );
  }

  if (
    repeatedSymbols.length
  ) {
    return (
      `Review why ${repeatedSymbols[0].symbol} keeps attracting your attention and confirm that your reasoning still matches your Wealth Blueprint.`
    );
  }

  return (
    "Keep recording decisions consistently so Coach G can identify stronger long-term behavior patterns."
  );
}