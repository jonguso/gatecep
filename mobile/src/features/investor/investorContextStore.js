import { userGetItem } from "../../auth/userStorage";

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

  const storedProfile = parseStoredValue(profileRaw);
  const canonicalDNA = parseStoredValue(dnaRaw);
  const canonicalBlueprint = parseStoredValue(blueprintRaw);
  const canonicalPracticePortfolio = parseStoredValue(practiceRaw);

  const profile =
    storedProfile?.profile ||
    storedProfile ||
    {};

  /*
   * Canonical sources first.
   * Legacy nested copies remain fallback-only.
   */
  const investorDNA =
    canonicalDNA ||
    storedProfile?.investorDNA ||
    profile?.dna ||
    null;

  const wealthBlueprint =
    canonicalBlueprint ||
    storedProfile?.wealthBlueprint ||
    profile?.wealthBlueprint ||
    null;

  const practicePortfolio =
    canonicalPracticePortfolio ||
    null;

  const firstName =
    profile?.firstName ||
    null;

  const lastName =
    profile?.lastName ||
    null;

  const investorType =
    investorDNA?.investorType ||
    profile?.investorType ||
    null;

  const goal =
    investorDNA?.goal ||
    profile?.goal ||
    null;

  const riskProfile =
    investorDNA?.riskProfile ||
    profile?.risk ||
    null;

  const hasInvestorDNA = Boolean(investorDNA);

  const hasWealthBlueprint = Boolean(wealthBlueprint);

  const hasPracticePortfolio =
    Boolean(practicePortfolio?.holdings?.length) ||
    Boolean(practicePortfolio?.status === "ACTIVE");

  return {
    storedProfile,
    profile,
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