import { useState } from "react";
import { router } from "expo-router";

import { createInvestorDNA } from "../../investor-dna/api/investorDNAApi";
import { userSetItem } from "../../../auth/userStorage";

const INITIAL_ANSWERS = {
  goal: null,
  timeHorizon: null,
  marketDrop: null,
  contribution: null,
  experience: null,
  amount: "10000"
};

export function useWelcomeJourney() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function updateAnswer(field, value) {
    setAnswers((current) => ({
      ...current,
      [field]: value
    }));

    setStep((current) => current + 1);
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function updateAmount(value) {
    setAnswers((current) => ({
      ...current,
      amount: value
    }));
  }

  function toDNAApiPayload() {
    const mapGoal = {
      home: "HOME_PURCHASE",
      family: "FINANCIAL_FREEDOM",
      retirement: "RETIREMENT",
      growth: "WEALTH_GROWTH",
      exploring: "WEALTH_GROWTH"
    };

    const mapTime = {
      soon: "UNDER_1_YEAR",
      few_years: "1_3_YEARS",
      later: "5_PLUS_YEARS",
      unsure: "3_5_YEARS"
    };

    const mapDrop = {
      calm: "BUY_MORE",
      wait: "WAIT",
      guidance: "UNSURE",
      worried: "SELL"
    };

    const mapContribution = {
      monthly: "MONTHLY",
      flexible: "FLEXIBLE",
      quarterly: "QUARTERLY",
      one_time: "ONE_TIME"
    };

    const mapExperience = {
      first_step: "NONE",
      learning: "BEGINNER",
      invested_before: "INTERMEDIATE",
      comfortable: "ADVANCED"
    };

    return {
      userId: "demo",
      goal: mapGoal[answers.goal] || "WEALTH_GROWTH",
      timeHorizon: mapTime[answers.timeHorizon] || "3_5_YEARS",
      marketDrop: mapDrop[answers.marketDrop] || "WAIT",
      contribution: mapContribution[answers.contribution] || "MONTHLY",
      experience: mapExperience[answers.experience] || "BEGINNER",
      amount: Number(answers.amount || 10000)
    };
  }

  function buildStarterPlanFromBlueprint(dna, blueprint) {
    const startingAmount = Number(dna.amount || answers.amount || 0);
    const allocation = blueprint?.allocation || { equity: 60, cash: 20, income: 20 };

    const equityName =
      dna.riskProfile === "GROWTH" || dna.riskProfile === "AGGRESSIVE"
        ? "Growth Stocks"
        : "ETF / Diversifier";

    const allocations = [
      [equityName, allocation.equity || 60],
      ["Dividend Stocks", allocation.income || 20],
      ["Cash Reserve", allocation.cash || 20]
    ];

    return {
      startingAmount,
      investPct: 100 - Number(allocation.cash || 20),
      cashPct: Number(allocation.cash || 20),
      totalInvested: startingAmount * ((100 - Number(allocation.cash || 20)) / 100),
      cashReserve: startingAmount * (Number(allocation.cash || 20) / 100),
      reviewFrequency:
        dna.contribution === "MONTHLY"
          ? "Monthly"
          : dna.contribution === "QUARTERLY"
          ? "Quarterly"
          : "Every 60–90 days",
      allocations: allocations.map(([name, weight]) => ({
        name,
        weight,
        amount: (startingAmount * weight) / 100
      }))
    };
  }

 async function completeJourney() {
  try {
    setLoading(true);

    const data = await createInvestorDNA(
      toDNAApiPayload()
    );

    const dna = data.dna;
    const wealthBlueprint = data.wealthBlueprint;

    const starterPlan =
      buildStarterPlanFromBlueprint(
        dna,
        wealthBlueprint
      );

    const saved = {
      profile: {
        ...answers,
        dna,
        wealthBlueprint,
        risk: String(
          dna.riskProfile || ""
        ).toLowerCase(),
        investorType: dna.investorType,
        amount: Number(
          dna.amount ||
          answers.amount ||
          0
        ),
        customerPath: "DEMO_INVESTOR",
        questionnaireCompleted: true,
        createdAt: dna.createdAt,
        updatedAt: dna.updatedAt
      },

      broker: {
        name: "GateCEP Demo Broker",
        beginnerScore: 100,
        feeScore: 100,
        researchScore: 100,
        supportScore: 100,
        onboardingScore: 100,
        reason:
          "Practice safely before connecting a real broker.",
        reasons: [
          "No real money required",
          "Built for learning first",
          "Coach G explains before action",
          "You decide when to connect a broker"
        ]
      },

      starterPlan,
      investorDNA: dna,
      wealthBlueprint,
      coachG: data.coachG
    };

    await userSetItem(
      "investorProfile",
      JSON.stringify(saved)
    );

    await userSetItem(
      "investorDNA",
      JSON.stringify(dna)
    );

    await userSetItem(
      "wealthBlueprint",
      JSON.stringify(wealthBlueprint)
    );

    await userSetItem(
      "onboardingCompleted",
      "false"
    );

    await userSetItem(
      "questionnaireCompleted",
      "true"
    );

    setResult(saved);
    setStep(7);
  } catch (error) {
    console.error(
      "Welcome Journey completion failed:",
      error
    );

    throw error;
  } finally {
    setLoading(false);
  }
}

  function goToStarterPlan() {
    router.push("/starter-plan");
  }

  function goToDashboard() {
    router.replace("/(tabs)/dashboard");
  }

  return {
    step,
    answers,
    result,
    loading,
    updateAnswer,
    updateAmount,
    goBack,
    completeJourney,
    goToStarterPlan,
    goToDashboard
  };
}