import { buildCanonicalRealWealthContext } from "./canonicalRealWealthContextService";
import { PORTFOLIO_SOURCE_TYPES } from "../portfolio-source/portfolioSourcePolicy";

export async function loadActivatedWealthJourneyContext(options = {}) {
  const canonical =
    await buildCanonicalRealWealthContext(options);

  const activation = canonical?.wealthActivation;
  const all = canonical?.portfolioSources?.allAccounts || null;
  const goalIntent = canonical?.investor?.goalIntent || null;
  const trackableGoals = Array.isArray(canonical?.investor?.goals)
    ? canonical.investor.goals
    : [];
  const contributionBehavior = canonical?.contributionBehavior || {};

  const goals = trackableGoals.length
    ? trackableGoals
    : goalIntent
      ? [{
        name: goalIntent,
        targetAmount: null,
        targetDate: null,
        currency: "KES",
        priority: "MEDIUM",
        completeness: "INTENT_ONLY",
        source: "INITIAL_INVESTOR_DNA"
      }]
      : [];

  if (!activation?.active) {
    return {
      canonical,
      active: false,
      advisorInput: {
        investor: canonical?.investor || {},
        investorDNA: canonical?.investor?.investorDNA || {},
        goals,
        contributionBehavior,
        portfolio: {},
        cash: {},
        holdings: [],
        realWealthActivation: {
          status: activation?.status,
          active: false,
          reason: activation?.reason
        }
      }
    };
  }

  return {
    canonical,
    active: true,
    advisorInput: {
      investor: canonical?.investor || {},
      investorDNA: canonical?.investor?.investorDNA || {},
      goals,
      contributionBehavior,
      portfolio: {
        currentValue: all?.totalValue ?? null,
        totalMarketValue: all?.holdingsValue ?? null,
        availableCash: all?.availableCash ?? null,
        holdings: all?.holdings || [],
        sourceId: PORTFOLIO_SOURCE_TYPES.ALL
      },
      cash: {
        availableCash: all?.availableCash ?? null
      },
      holdings: all?.holdings || [],
      realWealthActivation: {
        status: activation?.status,
        active: true,
        reason: activation?.reason
      }
    }
  };
}
