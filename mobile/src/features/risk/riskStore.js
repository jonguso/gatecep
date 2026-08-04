import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

import {
  getRiskProfile,
  RISK_PROFILE_TYPES
} from "./riskProfiles";

import {
  validateRiskLimits
} from "./riskLimits";

const RISK_CONFIG_KEY =
  "portfolioRiskConfiguration";

function normalizeStoredValue(
  value
) {
  if (!value) {
    return null;
  }

  if (
    typeof value ===
    "object"
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    try {
      return JSON.parse(
        value
      );
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeProfileType(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();
}

function normalizeRiskConfiguration(
  configuration = {}
) {
  const now =
    new Date()
      .toISOString();

  const profileType =
    normalizeProfileType(
      configuration
        ?.profileType
    ) ||
    RISK_PROFILE_TYPES
      .BALANCED;

  const profile =
    getRiskProfile(
      profileType
    );

  const limits =
    validateRiskLimits({
      ...profile.limits,
      ...(
        configuration
          ?.limits &&
        typeof configuration
          .limits ===
          "object"
          ? configuration.limits
          : {}
      )
    });

  return {
    id:
      configuration?.id ||
      `RISK-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`,

    type:
      "PORTFOLIO_RISK_CONFIGURATION",

    profileType,

    profileLabel:
      configuration
        ?.profileLabel ||
      profile.label,

    description:
      configuration
        ?.description ||
      profile.description,

    limits,

    stressTesting: {
      marketDeclinePercentages:
        Array.isArray(
          configuration
            ?.stressTesting
            ?.marketDeclinePercentages
        )
          ? configuration
              .stressTesting
              .marketDeclinePercentages
          : [
              5,
              10,
              20
            ],

      sectorShockPercentage:
        Number(
          configuration
            ?.stressTesting
            ?.sectorShockPercentage ??
          15
        ),

      singleHoldingShockPercentage:
        Number(
          configuration
            ?.stressTesting
            ?.singleHoldingShockPercentage ??
          20
        ),

      inflationShockPercentage:
        Number(
          configuration
            ?.stressTesting
            ?.inflationShockPercentage ??
          5
        ),

      interestRateShockPercentage:
        Number(
          configuration
            ?.stressTesting
            ?.interestRateShockPercentage ??
          2
        ),

      enabled:
        configuration
          ?.stressTesting
          ?.enabled !==
        false
    },

    alerts: {
      enabled:
        configuration
          ?.alerts
          ?.enabled !==
        false,

      concentrationAlerts:
        configuration
          ?.alerts
          ?.concentrationAlerts !==
        false,

      drawdownAlerts:
        configuration
          ?.alerts
          ?.drawdownAlerts !==
        false,

      volatilityAlerts:
        configuration
          ?.alerts
          ?.volatilityAlerts !==
        false,

      liquidityAlerts:
        configuration
          ?.alerts
          ?.liquidityAlerts !==
        false
    },

    status:
      configuration
        ?.status ||
      "ACTIVE",

    source:
      configuration
        ?.source ||
      (
        profileType ===
        RISK_PROFILE_TYPES
          .CUSTOM
          ? "CUSTOM_RISK_POLICY"
          : "RISK_PROFILE_TEMPLATE"
      ),

    notes:
      configuration
        ?.notes ||
      null,

    metadata:
      configuration
        ?.metadata &&
      typeof configuration
        .metadata ===
        "object"
        ? configuration.metadata
        : {},

    createdAt:
      configuration
        ?.createdAt ||
      now,

    updatedAt:
      configuration
        ?.updatedAt ||
      now
  };
}

/*
 * ============================================================
 * LOAD RISK CONFIGURATION
 * ============================================================
 */

export async function loadRiskConfiguration() {
  const raw =
    await userGetItem(
      RISK_CONFIG_KEY
    );

  const parsed =
    normalizeStoredValue(
      raw
    );

  if (
    !parsed
  ) {
    return null;
  }

  return normalizeRiskConfiguration(
    parsed
  );
}

/*
 * ============================================================
 * SAVE RISK CONFIGURATION
 * ============================================================
 */

export async function saveRiskConfiguration(
  configuration = {}
) {
  const existing =
    await loadRiskConfiguration();

  const normalized =
    normalizeRiskConfiguration({
      ...existing,
      ...configuration,

      id:
        configuration?.id ||
        existing?.id ||
        undefined,

      createdAt:
        existing?.createdAt ||
        configuration?.createdAt ||
        undefined,

      updatedAt:
        new Date()
          .toISOString()
    });

  await userSetItem(
    RISK_CONFIG_KEY,
    JSON.stringify(
      normalized
    )
  );

  return normalized;
}

/*
 * ============================================================
 * APPLY PROFILE
 * ============================================================
 */

export async function applyRiskProfile(
  profileType,
  overrides = {}
) {
  const profile =
    getRiskProfile(
      profileType
    );

  return saveRiskConfiguration({
    profileType:
      profile.code,

    profileLabel:
      profile.label,

    description:
      profile.description,

    limits: {
      ...profile.limits,
      ...(
        overrides
          ?.limits ||
        {}
      )
    },

    stressTesting:
      overrides
        ?.stressTesting ||
      undefined,

    alerts:
      overrides
        ?.alerts ||
      undefined,

    source:
      "RISK_PROFILE_TEMPLATE",

    notes:
      overrides
        ?.notes ||
      null,

    metadata: {
      ...(
        overrides
          ?.metadata ||
        {}
      ),

      appliedProfile:
        profile.code
    }
  });
}

/*
 * ============================================================
 * SAVE CUSTOM RISK POLICY
 * ============================================================
 */

export async function saveCustomRiskPolicy({
  limits = {},
  stressTesting = {},
  alerts = {},
  notes = null,
  metadata = {}
} = {}) {
  return saveRiskConfiguration({
    profileType:
      RISK_PROFILE_TYPES
        .CUSTOM,

    profileLabel:
      "Custom Risk Policy",

    description:
      "User-defined portfolio risk thresholds and stress-test settings.",

    limits,

    stressTesting,

    alerts,

    source:
      "CUSTOM_RISK_POLICY",

    notes,

    metadata
  });
}

/*
 * ============================================================
 * GET OR CREATE DEFAULT CONFIGURATION
 * ============================================================
 */

export async function getOrCreateRiskConfiguration() {
  const existing =
    await loadRiskConfiguration();

  if (
    existing
  ) {
    return existing;
  }

  return applyRiskProfile(
    RISK_PROFILE_TYPES
      .BALANCED
  );
}

/*
 * ============================================================
 * UPDATE LIMITS
 * ============================================================
 */

export async function updateRiskLimits(
  updates = {}
) {
  const current =
    await getOrCreateRiskConfiguration();

  return saveRiskConfiguration({
    ...current,

    profileType:
      RISK_PROFILE_TYPES
        .CUSTOM,

    profileLabel:
      "Custom Risk Policy",

    limits: {
      ...current.limits,
      ...updates
    },

    source:
      "CUSTOM_RISK_POLICY"
  });
}

/*
 * ============================================================
 * UPDATE STRESS SETTINGS
 * ============================================================
 */

export async function updateRiskStressSettings(
  updates = {}
) {
  const current =
    await getOrCreateRiskConfiguration();

  return saveRiskConfiguration({
    ...current,

    stressTesting: {
      ...current.stressTesting,
      ...updates
    }
  });
}

/*
 * ============================================================
 * UPDATE ALERT SETTINGS
 * ============================================================
 */

export async function updateRiskAlertSettings(
  updates = {}
) {
  const current =
    await getOrCreateRiskConfiguration();

  return saveRiskConfiguration({
    ...current,

    alerts: {
      ...current.alerts,
      ...updates
    }
  });
}

/*
 * ============================================================
 * CLEAR CONFIGURATION
 * ============================================================
 */

export async function clearRiskConfiguration() {
  await userSetItem(
    RISK_CONFIG_KEY,
    JSON.stringify(
      null
    )
  );

  return true;
}