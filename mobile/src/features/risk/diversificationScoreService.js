import {
  buildPortfolioConcentrationAnalysis
} from "./concentrationAnalysisService";

function number(value) {
  const parsed =
    Number(value || 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function roundPercent(value) {
  return Number(
    number(value).toFixed(2)
  );
}

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(
      number(value),
      minimum
    ),
    maximum
  );
}

function scoreHoldingCount({
  holdingsCount,
  minimumHoldingsCount
}) {
  const count =
    number(
      holdingsCount
    );

  const target =
    Math.max(
      number(
        minimumHoldingsCount
      ),
      1
    );

  return Math.round(
    clamp(
      (
        count /
        target
      ) *
        100,
      0,
      100
    )
  );
}

function scoreEffectiveHoldings({
  effectiveHoldings,
  holdingsCount
}) {
  const count =
    Math.max(
      number(
        holdingsCount
      ),
      1
    );

  return Math.round(
    clamp(
      (
        number(
          effectiveHoldings
        ) /
        count
      ) *
        100,
      0,
      100
    )
  );
}

function scoreLargestHolding({
  largestHoldingPercentage,
  maximumSingleHoldingPercentage
}) {
  const current =
    number(
      largestHoldingPercentage
    );

  const limit =
    Math.max(
      number(
        maximumSingleHoldingPercentage
      ),
      0.01
    );

  if (
    current <=
    limit
  ) {
    return Math.round(
      clamp(
        100 -
          (
            current /
            limit
          ) *
            20,
        75,
        100
      )
    );
  }

  const excess =
    (
      current -
      limit
    ) /
    limit;

  return Math.round(
    clamp(
      75 -
        excess *
          100,
      0,
      75
    )
  );
}

function scoreTopThree({
  topThreePercentage,
  maximumTopThreePercentage
}) {
  const current =
    number(
      topThreePercentage
    );

  const limit =
    Math.max(
      number(
        maximumTopThreePercentage
      ),
      0.01
    );

  if (
    current <=
    limit
  ) {
    return Math.round(
      clamp(
        100 -
          (
            current /
            limit
          ) *
            20,
        75,
        100
      )
    );
  }

  const excess =
    (
      current -
      limit
    ) /
    limit;

  return Math.round(
    clamp(
      75 -
        excess *
          100,
      0,
      75
    )
  );
}

function scoreSectorDiversification({
  normalizedSectorHhi,
  sectorCount
}) {
  if (
    number(
      sectorCount
    ) <= 1
  ) {
    return 15;
  }

  return Math.round(
    clamp(
      (
        1 -
        number(
          normalizedSectorHhi
        )
      ) *
        100,
      0,
      100
    )
  );
}

function scoreHoldingHhi(
  normalizedHhi
) {
  return Math.round(
    clamp(
      (
        1 -
        number(
          normalizedHhi
        )
      ) *
        100,
      0,
      100
    )
  );
}

function getDiversificationGrade(
  score
) {
  const safeScore =
    number(
      score
    );

  if (
    safeScore >= 85
  ) {
    return {
      code:
        "EXCELLENT",

      label:
        "Excellent",

      description:
        "The portfolio is broadly diversified across holdings and sectors."
    };
  }

  if (
    safeScore >= 70
  ) {
    return {
      code:
        "GOOD",

      label:
        "Good",

      description:
        "Diversification is generally healthy, with limited concentration concerns."
    };
  }

  if (
    safeScore >= 50
  ) {
    return {
      code:
        "MODERATE",

      label:
        "Moderate",

      description:
        "The portfolio has meaningful concentration that should be monitored."
    };
  }

  if (
    safeScore >= 30
  ) {
    return {
      code:
        "WEAK",

      label:
        "Weak",

      description:
        "The portfolio is concentrated and may be exposed to elevated company or sector risk."
    };
  }

  return {
    code:
      "POOR",

    label:
      "Poor",

    description:
      "The portfolio has severe concentration and limited diversification."
  };
}

function buildImprovementActions({
  concentration,
  scores,
  configuration
}) {
  const actions = [];

  const limits =
    configuration?.limits ||
    {};

  if (
    number(
      concentration
        ?.portfolio
        ?.holdingsCount
    ) <
    number(
      limits
        ?.minimumHoldingsCount
    )
  ) {
    actions.push({
      code:
        "INCREASE_HOLDING_COUNT",

      priority:
        "MEDIUM",

      title:
        "Increase the number of holdings",

      message:
        `The portfolio has ${number(
          concentration
            ?.portfolio
            ?.holdingsCount
        )} holdings, below the configured minimum of ${number(
          limits
            ?.minimumHoldingsCount
        )}.`
    });
  }

  if (
    scores
      ?.largestHolding <
    70
  ) {
    actions.push({
      code:
        "REDUCE_LARGEST_HOLDING",

      priority:
        "HIGH",

      title:
        "Reduce the largest holding",

      message:
        `${
          concentration
            ?.concentration
            ?.largestHolding
            ?.symbol ||
          "The largest holding"
        } represents ${roundPercent(
          concentration
            ?.concentration
            ?.largestHoldingPercentage
        ).toFixed(
          2
        )}% of portfolio value.`
    });
  }

  if (
    scores
      ?.topThree <
    70
  ) {
    actions.push({
      code:
        "REDUCE_TOP_THREE_CONCENTRATION",

      priority:
        "HIGH",

      title:
        "Reduce top-three concentration",

      message:
        `The top three holdings represent ${roundPercent(
          concentration
            ?.concentration
            ?.topThreePercentage
        ).toFixed(
          2
        )}% of portfolio value.`
    });
  }

  if (
    scores
      ?.sectorDiversification <
    70
  ) {
    actions.push({
      code:
        "DIVERSIFY_SECTORS",

      priority:
        "MEDIUM",

      title:
        "Increase sector diversification",

      message:
        `${
          concentration
            ?.sectorConcentration
            ?.largestSector
            ?.sector ||
          "The largest sector"
        } is the dominant sector at ${roundPercent(
          concentration
            ?.sectorConcentration
            ?.largestSectorPercentage
        ).toFixed(
          2
        )}%.`
    });
  }

  return actions.sort(
    (
      a,
      b
    ) => {
      const priorityRank = {
        HIGH:
          3,

        MEDIUM:
          2,

        LOW:
          1
      };

      return (
        number(
          priorityRank[
            b?.priority
          ]
        ) -
        number(
          priorityRank[
            a?.priority
          ]
        )
      );
    }
  );
}

/*
 * ============================================================
 * PC-020B
 * DIVERSIFICATION SCORE
 * ============================================================
 */

export async function buildPortfolioDiversificationScore() {
  const concentration =
    await buildPortfolioConcentrationAnalysis();

  if (
    concentration?.status ===
    "NOT_READY"
  ) {
    return {
      generatedAt:
        new Date().toISOString(),

      status:
        "NOT_READY",

      message:
        concentration?.message ||
        "Diversification scoring is not available.",

      score:
        0,

      grade:
        getDiversificationGrade(
          0
        ),

      components: {
        holdingCount:
          0,

        effectiveHoldings:
          0,

        largestHolding:
          0,

        topThree:
          0,

        holdingHhi:
          0,

        sectorDiversification:
          0
      },

      improvementActions:
        [],

      concentration
    };
  }

  const configuration =
    concentration
      ?.configuration ||
    {};

  const limits =
    configuration
      ?.limits ||
    {};

  const holdingCountScore =
    scoreHoldingCount({
      holdingsCount:
        concentration
          ?.portfolio
          ?.holdingsCount,

      minimumHoldingsCount:
        limits
          ?.minimumHoldingsCount
    });

  const effectiveHoldingsScore =
    scoreEffectiveHoldings({
      effectiveHoldings:
        concentration
          ?.concentration
          ?.effectiveHoldings,

      holdingsCount:
        concentration
          ?.portfolio
          ?.holdingsCount
    });

  const largestHoldingScore =
    scoreLargestHolding({
      largestHoldingPercentage:
        concentration
          ?.concentration
          ?.largestHoldingPercentage,

      maximumSingleHoldingPercentage:
        limits
          ?.maximumSingleHoldingPercentage
    });

  const topThreeScore =
    scoreTopThree({
      topThreePercentage:
        concentration
          ?.concentration
          ?.topThreePercentage,

      maximumTopThreePercentage:
        limits
          ?.maximumTopThreePercentage
    });

  const holdingHhiScore =
    scoreHoldingHhi(
      concentration
        ?.concentration
        ?.normalizedHhi
    );

  const sectorDiversificationScore =
    scoreSectorDiversification({
      normalizedSectorHhi:
        concentration
          ?.sectorConcentration
          ?.normalizedHhi,

      sectorCount:
        concentration
          ?.sectorConcentration
          ?.sectorCount
    });

  const components = {
    holdingCount:
      holdingCountScore,

    effectiveHoldings:
      effectiveHoldingsScore,

    largestHolding:
      largestHoldingScore,

    topThree:
      topThreeScore,

    holdingHhi:
      holdingHhiScore,

    sectorDiversification:
      sectorDiversificationScore
  };

  const score =
    Math.round(
      (
        holdingCountScore *
          0.15 +
        effectiveHoldingsScore *
          0.15 +
        largestHoldingScore *
          0.20 +
        topThreeScore *
          0.15 +
        holdingHhiScore *
          0.15 +
        sectorDiversificationScore *
          0.20
      )
    );

  const grade =
    getDiversificationGrade(
      score
    );

  const improvementActions =
    buildImprovementActions({
      concentration,

      scores:
        components,

      configuration
    });

  const status =
    concentration
      ?.summary
      ?.breached >
    0
      ? "CONCENTRATION_BREACH"
      : score >= 70
      ? "HEALTHY"
      : "REVIEW_REQUIRED";

  return {
    generatedAt:
      new Date().toISOString(),

    status,

    message:
      grade.description,

    score,

    grade,

    components,

    metrics: {
      holdingsCount:
        number(
          concentration
            ?.portfolio
            ?.holdingsCount
        ),

      sectorCount:
        number(
          concentration
            ?.portfolio
            ?.sectorCount
        ),

      effectiveHoldings:
        number(
          concentration
            ?.concentration
            ?.effectiveHoldings
        ),

      effectiveSectors:
        number(
          concentration
            ?.sectorConcentration
            ?.effectiveSectors
        ),

      holdingHhi:
        number(
          concentration
            ?.concentration
            ?.hhi
        ),

      normalizedHoldingHhi:
        number(
          concentration
            ?.concentration
            ?.normalizedHhi
        ),

      sectorHhi:
        number(
          concentration
            ?.sectorConcentration
            ?.hhi
        ),

      normalizedSectorHhi:
        number(
          concentration
            ?.sectorConcentration
            ?.normalizedHhi
        ),

      largestHoldingPercentage:
        number(
          concentration
            ?.concentration
            ?.largestHoldingPercentage
        ),

      topThreePercentage:
        number(
          concentration
            ?.concentration
            ?.topThreePercentage
        ),

      topFivePercentage:
        number(
          concentration
            ?.concentration
            ?.topFivePercentage
        ),

      largestSectorPercentage:
        number(
          concentration
            ?.sectorConcentration
            ?.largestSectorPercentage
        )
    },

    improvementActions,

    concentration
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildDiversificationSummary() {
  const analysis =
    await buildPortfolioDiversificationScore();

  return {
    generatedAt:
      analysis.generatedAt,

    status:
      analysis.status,

    score:
      analysis.score,

    grade:
      analysis
        ?.grade
        ?.label ||
      "Not available",

    holdingsCount:
      analysis
        ?.metrics
        ?.holdingsCount ||
      0,

    effectiveHoldings:
      analysis
        ?.metrics
        ?.effectiveHoldings ||
      0,

    sectorCount:
      analysis
        ?.metrics
        ?.sectorCount ||
      0,

    largestHoldingPercentage:
      analysis
        ?.metrics
        ?.largestHoldingPercentage ||
      0,

    topThreePercentage:
      analysis
        ?.metrics
        ?.topThreePercentage ||
      0,

    largestSectorPercentage:
      analysis
        ?.metrics
        ?.largestSectorPercentage ||
      0,

    priorityAction:
      analysis
        ?.improvementActions?.[0] ||
      null
  };
}

export async function loadDiversificationImprovementActions() {
  const analysis =
    await buildPortfolioDiversificationScore();

  return analysis
    .improvementActions;
}