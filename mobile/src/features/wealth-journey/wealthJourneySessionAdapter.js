import {
  buildInvestorWealthContext
} from "./investorWealthContextService";

import {
  buildWealthJourneyInvestorExperience
} from "./wealthJourneyExperienceService";

/*
 * PC-028G
 * Wealth Journey Session Adapter
 *
 * One call:
 * current GateCEP investor -> standardized wealth context ->
 * PC-028 investor experience.
 */

export async function buildCurrentInvestorWealthJourney({
  session = {},
  seedContext = {}
} = {}) {
  const wealthContext =
    await buildInvestorWealthContext({
      session,
      seedContext
    });

  const experience =
    buildWealthJourneyInvestorExperience(
      wealthContext
        .advisorInput
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    wealthContext,

    experience,

    status:
      wealthContext
        .status,

    ready:
      wealthContext
        ?.readiness
        ?.coreReady ===
      true,

    coachGContext: {
      ...wealthContext
        .coachGContext,

      topPriorityGoal:
        experience
          ?.journey
          ?.topPriorityGoal ||
        null,

      executiveSummary:
        experience
          ?.journey
          ?.executiveSummary ||
        null
    }
  };
}

export async function loadCurrentInvestorWealthJourney(
  options = {}
) {
  return buildCurrentInvestorWealthJourney(
    options
  );
}

export async function loadCurrentInvestorWealthJourneyHomeCard(
  options = {}
) {
  const result =
    await buildCurrentInvestorWealthJourney(
      options
    );

  return result
    ?.experience
    ?.homeCard ||
    null;
}

export async function loadCurrentInvestorWealthJourneyCoachGPrompt(
  options = {}
) {
  const result =
    await buildCurrentInvestorWealthJourney(
      options
    );

  return result
    ?.experience
    ?.coachGPrompt ||
    null;
}

export async function loadCurrentInvestorWealthJourneyGoals(
  options = {}
) {
  const result =
    await buildCurrentInvestorWealthJourney(
      options
    );

  return result
    ?.experience
    ?.goalsSummary ||
    null;
}
