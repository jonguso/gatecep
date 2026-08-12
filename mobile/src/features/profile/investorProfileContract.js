const MAPS = {
  goal: {
    home: "Home Purchase",
    home_purchase: "Home Purchase",
    family: "Family Security",
    financial_freedom: "Family Security",
    retirement: "Retirement",
    growth: "Build Wealth",
    wealth_growth: "Build Wealth",
    exploring: "Need Guidance",
    education: "Education",
    preserve_capital: "Preserve Capital",
    dividend_income: "Dividend Income"
  },
  risk: {
    conservative: "Conservative",
    balanced: "Balanced",
    growth: "Growth",
    aggressive: "Aggressive"
  },
  experience: {
    first_step: "Beginner",
    none: "Beginner",
    learning: "Beginner",
    beginner: "Beginner",
    invested_before: "Intermediate",
    intermediate: "Intermediate",
    comfortable: "Advanced",
    advanced: "Advanced"
  },
  timeHorizon: {
    soon: "Under 1 Year",
    under_1_year: "Under 1 Year",
    "<1_year": "Under 1 Year",
    few_years: "1-3 Years",
    "1_3_years": "1-3 Years",
    "1_5_years": "1-3 Years",
    unsure: "3-5 Years",
    "3_5_years": "3-5 Years",
    later: "5+ Years",
    "5_plus_years": "5+ Years",
    "5_10_years": "5+ Years",
    "10_plus_years": "5+ Years"
  },
  contribution: {
    one_time: "One Time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    flexible: "Flexible"
  },
  marketDrop: {
    calm: "Buy More",
    buy_more: "Buy More",
    wait: "Wait",
    guidance: "Unsure",
    unsure: "Unsure",
    worried: "Sell",
    sell: "Sell"
  }
};

function token(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function profileValueLabel(field, value) {
  if (value === null || value === undefined || value === "") return null;
  return MAPS[field]?.[token(value)] || String(value);
}

export function flattenInvestorProfile(value = {}) {
  if (!value || typeof value !== "object") return {};

  const nested =
    value.profile && typeof value.profile === "object"
      ? value.profile
      : {};

  return {
    ...value,
    ...nested,
    constraints: {
      ...(value.constraints || {}),
      ...(nested.constraints || {})
    }
  };
}

export function normalizeInvestorProfile(value = {}) {
  const flat = flattenInvestorProfile(value);
  const constraints = flat.constraints || {};

  return {
    ...flat,
    name: flat.name || constraints.name || null,
    goal: profileValueLabel("goal", flat.goal),
    risk: profileValueLabel(
      "risk",
      flat.risk ?? flat.riskTolerance ?? flat.riskProfile
    ),
    experience: profileValueLabel("experience", flat.experience),
    timeHorizon: profileValueLabel(
      "timeHorizon",
      flat.timeHorizon ?? flat.time_horizon
    ),
    contribution: profileValueLabel("contribution", flat.contribution),
    marketDrop: profileValueLabel(
      "marketDrop",
      flat.marketDrop ?? constraints.marketDrop
    ),
    amount: Number(flat.amount ?? constraints.amount ?? 0)
  };
}

export function mergeProfileSources(cloud = {}, local = {}) {
  const cloudFlat = flattenInvestorProfile(cloud);
  const localFlat = flattenInvestorProfile(local);

  return normalizeInvestorProfile({
    ...cloudFlat,
    ...localFlat,
    constraints: {
      ...(cloudFlat.constraints || {}),
      ...(localFlat.constraints || {})
    }
  });
}

export function mergeInvestorProfileStorage(existing = {}, updates = {}) {
  const hasWrapper =
    existing?.profile && typeof existing.profile === "object";
  const previousProfile = hasWrapper ? existing.profile : existing;
  const nextProfile = {
    ...previousProfile,
    ...updates,
    constraints: {
      ...(previousProfile?.constraints || {}),
      ...(updates?.constraints || {})
    },
    updatedAt: new Date().toISOString()
  };

  return {
    ...existing,
    ...updates,
    profile: nextProfile,
    constraints: nextProfile.constraints,
    updatedAt: nextProfile.updatedAt
  };
}
