import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  loadDecisionJournal
} from "../decision-journal/decisionJournalStore";

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function normalizeDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function isCurrentMonth(value) {
  const date = normalizeDate(value);

  if (!date) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function average(values = []) {
  const safe = values
    .map(Number)
    .filter(Number.isFinite);

  if (!safe.length) {
    return 0;
  }

  return (
    safe.reduce(
      (sum, value) => sum + value,
      0
    ) / safe.length
  );
}

export async function buildMonthlyReview() {
  const [
    context,
    journal
  ] = await Promise.all([
    loadInvestorContext(),
    loadDecisionJournal()
  ]);

  const profile =
    context?.profile || {};

  const investorDNA =
    context?.investorDNA || null;

  const blueprint =
    context?.wealthBlueprint || null;

  const portfolio =
    context?.practicePortfolio || null;

  const decisions =
    Array.isArray(journal)
      ? journal
      : [];

  const monthlyDecisions =
    decisions.filter(
      (entry) =>
        isCurrentMonth(
          entry.createdAt
        )
    );

  const holdings =
    Array.isArray(
      portfolio?.holdings
    )
      ? portfolio.holdings
      : [];

  const startingAmount =
    Number(
      portfolio?.startingAmount ||
      investorDNA?.amount ||
      profile?.amount ||
      0
    );

  const investedAmount =
    Number(
      portfolio?.investedAmount ||
      0
    );

  const availableCash =
    Number(
      portfolio?.availableCash ||
      0
    );

  const currentPortfolioValue =
    holdings.reduce(
      (sum, holding) =>
        sum +
        Number(
          holding.marketValue ||
          0
        ),
      0
    );

  const totalPracticeValue =
    currentPortfolioValue +
    availableCash;

  const totalProfitLoss =
    holdings.reduce(
      (sum, holding) =>
        sum +
        Number(
          holding.profitLoss ||
          0
        ),
      0
    );

  const confidenceAverage =
    average(
      monthlyDecisions.map(
        (entry) =>
          entry.confidence
      )
    );

  const decisionsBySymbol =
    monthlyDecisions.reduce(
      (result, entry) => {
        const symbol =
          entry.symbol ||
          "UNKNOWN";

        result[symbol] =
          (result[symbol] || 0) +
          1;

        return result;
      },
      {}
    );

  const mostReviewedSymbol =
    Object.entries(
      decisionsBySymbol
    ).sort(
      (a, b) =>
        b[1] - a[1]
    )[0]?.[0] || null;

  const firstName =
    context?.identity?.firstName ||
    profile?.firstName ||
    "";

  const investorType =
    investorDNA?.investorType ||
    context?.investor
      ?.investorType ||
    "Developing Investor";

  const riskProfile =
    investorDNA?.riskProfile ||
    context?.investor
      ?.riskProfile ||
    "Not set";

  const goal =
    investorDNA?.goal ||
    context?.investor?.goal ||
    "Not set";

  const review = {
    generatedAt:
      new Date().toISOString(),

    investor: {
      firstName,
      investorType,
      riskProfile,
      goal
    },

    portfolio: {
      startingAmount,
      investedAmount,
      availableCash,
      currentPortfolioValue,
      totalPracticeValue,
      totalProfitLoss,
      holdingsCount:
        holdings.length
    },

    decisions: {
      monthlyCount:
        monthlyDecisions.length,

      totalCount:
        decisions.length,

      confidenceAverage,

      mostReviewedSymbol,

      entries:
        monthlyDecisions
    },

    blueprint,

    coachG: {
      headline:
        buildHeadline({
          firstName,
          monthlyCount:
            monthlyDecisions.length
        }),

      portfolioMessage:
        buildPortfolioMessage({
          startingAmount,
          totalPracticeValue,
          availableCash,
          holdingsCount:
            holdings.length
        }),

      behaviorMessage:
        buildBehaviorMessage({
          monthlyDecisions,
          confidenceAverage
        }),

      nextFocus:
        buildNextFocus({
          monthlyDecisions,
          availableCash,
          holdingsCount:
            holdings.length
        })
    }
  };

  return review;
}

function buildHeadline({
  firstName,
  monthlyCount
}) {
  const name =
    firstName
      ? `${firstName}, `
      : "";

  if (monthlyCount === 0) {
    return (
      `${name}this month was quiet. ` +
      "Let's review your plan before making the next decision."
    );
  }

  return (
    `${name}you recorded ${monthlyCount} ` +
    `${monthlyCount === 1 ? "decision" : "decisions"} this month. ` +
    "Let's look at what your behavior is telling us."
  );
}

function buildPortfolioMessage({
  startingAmount,
  totalPracticeValue,
  availableCash,
  holdingsCount
}) {
  if (!startingAmount) {
    return (
      "Your Practice Portfolio is not ready for a monthly review yet."
    );
  }

  return (
    `Your Practice Portfolio currently accounts for KES ${money(
      totalPracticeValue
    )}, including KES ${money(
      availableCash
    )} in available cash across ${holdingsCount} holdings.`
  );
}

function buildBehaviorMessage({
  monthlyDecisions,
  confidenceAverage
}) {
  if (!monthlyDecisions.length) {
    return (
      "You have not recorded a practice decision this month. " +
      "Before your next investment idea, record why it interests you and what you expect from it."
    );
  }

  return (
    `Your average confidence this month was ${confidenceAverage.toFixed(
      1
    )} out of 5. ` +
    "The goal is not maximum confidence—it is making decisions for clear, documented reasons."
  );
}

function buildNextFocus({
  monthlyDecisions,
  availableCash,
  holdingsCount
}) {
  if (!monthlyDecisions.length) {
    return (
      "Record at least one investment decision and explain the reason before acting."
    );
  }

  if (holdingsCount === 0) {
    return (
      "Complete your Practice Portfolio so Coach G can compare your decisions with your actual allocation."
    );
  }

  if (availableCash > 0) {
    return (
      "Review whether your available cash still matches your Wealth Blueprint before considering another investment."
    );
  }

  return (
    "Review your existing holdings before adding another position."
  );
}