import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

function parseStoredValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function loadInvestorContext() {
  const [
    profileRaw,
    dnaRaw,
    blueprintRaw,
    practiceRaw
  ] = await Promise.all([
    userGetItem("investorProfile").catch(() => null),
    userGetItem("investorDNA").catch(() => null),
    userGetItem("wealthBlueprint").catch(() => null),
    userGetItem("practicePortfolio").catch(() => null)
  ]);

  const storedProfile =
    parseStoredValue(profileRaw) || {};

  const canonicalDNA =
    parseStoredValue(dnaRaw);

  const canonicalBlueprint =
    parseStoredValue(blueprintRaw);

  const canonicalPracticePortfolio =
    parseStoredValue(practiceRaw);

  /*
   * Older GateCEP records may store identity fields
   * at the root while questionnaire fields are stored
   * inside the nested profile object.
   */
  const nestedProfile =
    storedProfile?.profile &&
    typeof storedProfile.profile === "object"
      ? storedProfile.profile
      : {};

  /*
   * Create one normalized profile object for consumers.
   *
   * Nested questionnaire values are preserved, while
   * root identity and compatibility values remain available.
   */
  const profile = {
    ...storedProfile,
    ...nestedProfile
  };

  /*
   * Canonical sources first.
   * Legacy nested copies remain fallback-only.
   */
  const investorDNA =
    canonicalDNA ||
    storedProfile?.investorDNA ||
    nestedProfile?.investorDNA ||
    nestedProfile?.dna ||
    null;

  const wealthBlueprint =
    canonicalBlueprint ||
    storedProfile?.wealthBlueprint ||
    nestedProfile?.wealthBlueprint ||
    null;

  const practicePortfolio =
    canonicalPracticePortfolio ||
    storedProfile?.practicePortfolio ||
    nestedProfile?.practicePortfolio ||
    null;

  /*
   * Identity may exist at either the root or nested level.
   */
  const firstName =
    storedProfile?.firstName ||
    nestedProfile?.firstName ||
    null;

  const lastName =
    storedProfile?.lastName ||
    nestedProfile?.lastName ||
    null;

  const investorType =
    investorDNA?.investorType ||
    storedProfile?.investorType ||
    nestedProfile?.investorType ||
    null;

  const goal =
    investorDNA?.goal ||
    storedProfile?.goal ||
    nestedProfile?.goal ||
    null;

  const riskProfile =
    investorDNA?.riskProfile ||
    storedProfile?.riskProfile ||
    storedProfile?.risk ||
    nestedProfile?.riskProfile ||
    nestedProfile?.risk ||
    null;

  const hasInvestorDNA =
    Boolean(investorDNA);

  const hasWealthBlueprint =
    Boolean(wealthBlueprint);

  const hasPracticePortfolio =
    Boolean(practicePortfolio?.holdings?.length) ||
    practicePortfolio?.status === "ACTIVE";

  return {
    storedProfile,

    profile: {
      ...profile,
      firstName,
      lastName
    },

    investorDNA,
    wealthBlueprint,
    practicePortfolio,

    identity: {
      firstName,
      lastName
    },

    investor: {
      investorType,
      goal,
      riskProfile
    },

    journey: {
      hasInvestorDNA,
      hasWealthBlueprint,
      hasPracticePortfolio
    }
  };
}

/*
 * ============================================================
 * SAVE PRACTICE PORTFOLIO
 * ============================================================
 */

export async function savePracticePortfolio(
  portfolio = {}
) {
  const now =
    new Date().toISOString();

  const holdings =
    Array.isArray(
      portfolio?.holdings
    )
      ? portfolio.holdings
      : [];

  const investedAmount =
    holdings.reduce(
      (total, holding) =>
        total +
        Number(
          holding?.quantity ||
          0
        ) *
        Number(
          holding?.averagePrice ||
          holding?.averageCost ||
          0
        ),
      0
    );

  const holdingsValue =
    holdings.reduce(
      (total, holding) =>
        total +
        Number(
          holding?.quantity ||
          0
        ) *
        Number(
          holding?.marketPrice ||
          holding?.price ||
          0
        ),
      0
    );

  const availableCash =
    Number(
      portfolio?.availableCash ||
      0
    );

  const normalized = {
    ...portfolio,

    holdings,

    investedAmount,

    holdingsValue,

    availableCash,

    totalValue:
      holdingsValue +
      availableCash,

    status:
      portfolio?.status ||
      "ACTIVE",

    createdAt:
      portfolio?.createdAt ||
      now,

    updatedAt:
      now
  };

  await userSetItem(
    "practicePortfolio",
    JSON.stringify(
      normalized
    )
  );

  return normalized;
}