import {
  loadCanonicalInvestorJourneyContext
} from "./investorJourneyContinuityBridge";

/*
 * ============================================================
 * PC-028K
 * WEALTH JOURNEY CONTINUITY ADAPTER
 * ============================================================
 *
 * Converts the canonical continuity record into the exact shape expected
 * by PC-028G / PC-028E.
 *
 * This is the key missing bridge:
 *
 * Investor DNA goal intent
 *       +
 * actual uploaded portfolio
 *       ↓
 * same Wealth Journey context
 * ============================================================
 */

function n(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function adaptCanonicalJourneyToWealthContext(
  journey = {}
) {
  const position =
    journey
      ?.currentFinancialPosition ||
    {};

  const goalIntent =
    journey
      ?.investor
      ?.goalIntent ||
    null;

  const goals =
    goalIntent
      ? [
          {
            name:
              goalIntent,

            targetAmount:
              null,

            targetDate:
              null,

            currency:
              "KES",

            priority:
              "MEDIUM",

            source:
              "INITIAL_INVESTOR_DNA",

            completeness:
              "INTENT_ONLY",

            includeCash:
              true
          }
        ]
      : [];

  return {
    investor:
      {
        firstName:
          journey
            ?.investor
            ?.firstName ||
          null,

        lastName:
          journey
            ?.investor
            ?.lastName ||
          null,

        investorType:
          journey
            ?.investor
            ?.investorType ||
          null,

        riskProfile:
          journey
            ?.investor
            ?.riskProfile ||
          null
      },

    investorDNA:
      journey
        ?.investor
        ?.investorDNA ||
      {},

    goals,

    portfolio: {
      currentValue:
        n(
          position
            ?.totalValue
        ),

      totalMarketValue:
        n(
          position
            ?.holdingsValue
        ),

      investedValue:
        n(
          position
            ?.investedValue
        ),

      availableCash:
        n(
          position
            ?.availableCash
        ),

      holdings:
        position
          ?.holdings ||
        [],

      sourceStage:
        position
          ?.sourceStage ||
        null
    },

    cash: {
      availableCash:
        n(
          position
            ?.availableCash
        )
    },

    holdings:
      position
        ?.holdings ||
      [],

    journeyContinuity: {
      currentStage:
        journey
          ?.journeyState
          ?.currentStage ||
        null,

      hasInitialDNA:
        Boolean(
          journey
            ?.journeyState
            ?.hasInitialDNA
        ),

      hasPracticeEvidence:
        Boolean(
          journey
            ?.journeyState
            ?.hasPracticeEvidence
        ),

      hasActualInvestmentEvidence:
        Boolean(
          journey
            ?.journeyState
            ?.hasActualInvestmentEvidence
        )
    },

    source: {
      sourceType:
        "INVESTOR_JOURNEY_CONTINUITY",

      sourceReference:
        journey
          ?.journeyState
          ?.currentStage ||
        null
    }
  };
}

export async function loadContinuityWealthContext(
  options = {}
) {
  const journey =
    await loadCanonicalInvestorJourneyContext(
      options
    );

  return {
    journey,

    wealthContext:
      adaptCanonicalJourneyToWealthContext(
        journey
      )
  };
}
