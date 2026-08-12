import { buildCurrentInvestorWealthJourney } from "./wealthJourneySessionAdapter";
import { reconcileWealthJourneyRuntimeResult } from "./wealthJourneyRuntimeReconciliation";
import { loadActivatedWealthJourneyContext } from "./realWealthActivationAdapter";

export async function loadRealCurrentInvestorWealthJourney() {
  const activation =
    await loadActivatedWealthJourneyContext();

  if (!activation?.active) {
    return {
      status: "PRACTICE_ONLY",
      ready: false,

      wealthContext: {
        status: "PRACTICE_ONLY",
        readiness: {
          coreReady: false,
          missingForWealthJourney: ["REAL_INVESTMENT_DATA"],
          providerFailures: []
        }
      },

      experience: {
        journey: {
          goalAdvice: [],
          topPriorityGoal: null
        },

        goalsSummary: {
          totalGoals:
            activation?.advisorInput?.goals?.length || 0,
          onTrack: 0,
          needsAttention: 0,
          achieved: 0,
          goals: []
        },

        coachGPrompt: {
          shouldSurface: true,
          priority: "INFO",
          title:
            "Your real Wealth Journey starts with real investment data",
          message:
            "Practice is for learning and familiarization only. Connect a broker or upload your actual portfolio so Coach G can begin tracking your real financial progress.",
          suggestedQuestion:
            "Coach G, how do I connect or upload my real investment portfolio?"
        },

        portfolioContext: {
          visible: false
        },

        dnaContext: {
          visible: false
        }
      }
    };
  }

  const raw =
    await buildCurrentInvestorWealthJourney({
      seedContext: activation.advisorInput
    });

  return reconcileWealthJourneyRuntimeResult(raw);
}

export async function loadRealWealthJourneyHomeCard() {
  const result = await loadRealCurrentInvestorWealthJourney();
  return result?.experience?.homeCard || null;
}

export async function loadRealWealthJourneyCoachGPrompt() {
  const result = await loadRealCurrentInvestorWealthJourney();
  return result?.experience?.coachGPrompt || null;
}

export async function loadRealWealthJourneyGoalsSummary() {
  const result = await loadRealCurrentInvestorWealthJourney();
  return result?.experience?.goalsSummary || null;
}

export async function loadRealWealthJourneyPortfolioContext() {
  const result = await loadRealCurrentInvestorWealthJourney();
  return result?.experience?.portfolioContext || null;
}

export async function loadRealWealthJourneyDNAContext() {
  const result = await loadRealCurrentInvestorWealthJourney();
  return result?.experience?.dnaContext || null;
}
