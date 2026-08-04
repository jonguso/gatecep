export const RISK_PROFILE_TYPES = {
  CONSERVATIVE:
    "CONSERVATIVE",

  MODERATE:
    "MODERATE",

  BALANCED:
    "BALANCED",

  GROWTH:
    "GROWTH",

  AGGRESSIVE:
    "AGGRESSIVE",

  CUSTOM:
    "CUSTOM"
};

export const RISK_PROFILES = {
  CONSERVATIVE: {
    code:
      RISK_PROFILE_TYPES
        .CONSERVATIVE,

    label:
      "Conservative",

    description:
      "Prioritizes capital preservation, liquidity, and lower concentration.",

    limits: {
      maximumSingleHoldingPercentage:
        15,

      maximumSectorPercentage:
        30,

      minimumCashPercentage:
        20,

      maximumEquityPercentage:
        70,

      targetVolatilityPercentage:
        10,

      maximumDrawdownPercentage:
        12,

      minimumHoldingsCount:
        8,

      maximumTopThreePercentage:
        45,

      maximumIlliquidPercentage:
        10,

      minimumLiquidityCoverageMonths:
        12,

      alertWarningThresholdPercentage:
        80,

      alertCriticalThresholdPercentage:
        100
    }
  },

  MODERATE: {
    code:
      RISK_PROFILE_TYPES
        .MODERATE,

    label:
      "Moderate",

    description:
      "Balances capital preservation with measured long-term growth.",

    limits: {
      maximumSingleHoldingPercentage:
        20,

      maximumSectorPercentage:
        35,

      minimumCashPercentage:
        15,

      maximumEquityPercentage:
        80,

      targetVolatilityPercentage:
        14,

      maximumDrawdownPercentage:
        18,

      minimumHoldingsCount:
        7,

      maximumTopThreePercentage:
        55,

      maximumIlliquidPercentage:
        15,

      minimumLiquidityCoverageMonths:
        9,

      alertWarningThresholdPercentage:
        80,

      alertCriticalThresholdPercentage:
        100
    }
  },

  BALANCED: {
    code:
      RISK_PROFILE_TYPES
        .BALANCED,

    label:
      "Balanced",

    description:
      "Balances portfolio growth, income, diversification, and liquidity.",

    limits: {
      maximumSingleHoldingPercentage:
        25,

      maximumSectorPercentage:
        40,

      minimumCashPercentage:
        10,

      maximumEquityPercentage:
        90,

      targetVolatilityPercentage:
        18,

      maximumDrawdownPercentage:
        25,

      minimumHoldingsCount:
        6,

      maximumTopThreePercentage:
        65,

      maximumIlliquidPercentage:
        20,

      minimumLiquidityCoverageMonths:
        6,

      alertWarningThresholdPercentage:
        80,

      alertCriticalThresholdPercentage:
        100
    }
  },

  GROWTH: {
    code:
      RISK_PROFILE_TYPES
        .GROWTH,

    label:
      "Growth",

    description:
      "Accepts higher volatility and concentration in pursuit of long-term growth.",

    limits: {
      maximumSingleHoldingPercentage:
        30,

      maximumSectorPercentage:
        50,

      minimumCashPercentage:
        5,

      maximumEquityPercentage:
        97,

      targetVolatilityPercentage:
        24,

      maximumDrawdownPercentage:
        35,

      minimumHoldingsCount:
        5,

      maximumTopThreePercentage:
        75,

      maximumIlliquidPercentage:
        30,

      minimumLiquidityCoverageMonths:
        3,

      alertWarningThresholdPercentage:
        85,

      alertCriticalThresholdPercentage:
        100
    }
  },

  AGGRESSIVE: {
    code:
      RISK_PROFILE_TYPES
        .AGGRESSIVE,

    label:
      "Aggressive",

    description:
      "Prioritizes maximum growth and accepts substantial volatility and drawdown risk.",

    limits: {
      maximumSingleHoldingPercentage:
        40,

      maximumSectorPercentage:
        60,

      minimumCashPercentage:
        2,

      maximumEquityPercentage:
        100,

      targetVolatilityPercentage:
        32,

      maximumDrawdownPercentage:
        50,

      minimumHoldingsCount:
        4,

      maximumTopThreePercentage:
        85,

      maximumIlliquidPercentage:
        40,

      minimumLiquidityCoverageMonths:
        1,

      alertWarningThresholdPercentage:
        90,

      alertCriticalThresholdPercentage:
        100
    }
  },

  CUSTOM: {
    code:
      RISK_PROFILE_TYPES
        .CUSTOM,

    label:
      "Custom",

    description:
      "A user-defined portfolio risk policy.",

    limits: {
      maximumSingleHoldingPercentage:
        25,

      maximumSectorPercentage:
        40,

      minimumCashPercentage:
        10,

      maximumEquityPercentage:
        90,

      targetVolatilityPercentage:
        18,

      maximumDrawdownPercentage:
        25,

      minimumHoldingsCount:
        6,

      maximumTopThreePercentage:
        65,

      maximumIlliquidPercentage:
        20,

      minimumLiquidityCoverageMonths:
        6,

      alertWarningThresholdPercentage:
        80,

      alertCriticalThresholdPercentage:
        100
    }
  }
};

export function getRiskProfile(
  profileType
) {
  const normalized =
    String(
      profileType ||
      ""
    )
      .trim()
      .toUpperCase();

  return (
    RISK_PROFILES[
      normalized
    ] ||
    RISK_PROFILES
      .BALANCED
  );
}

export function listRiskProfiles() {
  return Object.values(
    RISK_PROFILES
  ).map(
    (profile) => ({
      ...profile,

      limits: {
        ...profile.limits
      }
    })
  );
}