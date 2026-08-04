import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

import {
  getAllocationTemplate,
  REBALANCE_PROFILE_TYPES,
  TARGET_ALLOCATION_MODES
} from "./allocationTemplates";

const REBALANCE_TARGET_KEY =
  "portfolioRebalanceTarget";

function number(value) {
  const parsed =
    Number(
      value ||
      0
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function roundPercent(value) {
  return Number(
    number(value).toFixed(4)
  );
}

function normalizeKey(value) {
  return String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();
}

function normalizeStoredValue(value) {
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

function normalizeTargetItem(
  item = {}
) {
  const key =
    normalizeKey(
      item?.key ||
      item?.symbol ||
      item?.sector
    );

  return {
    key,

    label:
      item?.label ||
      item?.name ||
      item?.symbol ||
      item?.sector ||
      key,

    percentage:
      roundPercent(
        item?.percentage
      ),

    symbol:
      normalizeKey(
        item?.symbol
      ) ||
      null,

    sector:
      item?.sector ||
      null,

    assetClass:
      normalizeKey(
        item?.assetClass
      ) ||
      null,

    notes:
      item?.notes ||
      null
  };
}

function normalizeTargetItems(
  items = []
) {
  const safeItems =
    Array.isArray(
      items
    )
      ? items
      : [];

  const merged =
    new Map();

  safeItems.forEach(
    (item) => {
      const normalized =
        normalizeTargetItem(
          item
        );

      if (
        !normalized.key
      ) {
        return;
      }

      const existing =
        merged.get(
          normalized.key
        );

      if (
        existing
      ) {
        merged.set(
          normalized.key,
          {
            ...existing,

            percentage:
              roundPercent(
                existing
                  .percentage +
                normalized
                  .percentage
              )
          }
        );

        return;
      }

      merged.set(
        normalized.key,
        normalized
      );
    }
  );

  return Array.from(
    merged.values()
  );
}

function totalPercentage(
  targets = []
) {
  return roundPercent(
    targets.reduce(
      (
        sum,
        target
      ) =>
        sum +
        number(
          target
            ?.percentage
        ),
      0
    )
  );
}

function normalizeRebalanceTarget(
  target = {}
) {
  const now =
    new Date()
      .toISOString();

  const profileType =
    normalizeKey(
      target?.profileType
    ) ||
    REBALANCE_PROFILE_TYPES
      .BALANCED;

  const template =
    getAllocationTemplate(
      profileType
    );

  const mode =
    normalizeKey(
      target?.mode
    ) ||
    template.mode ||
    TARGET_ALLOCATION_MODES
      .ASSET_CLASS;

  const suppliedTargets =
    Array.isArray(
      target?.targets
    )
      ? target.targets
      : null;

  const targets =
    normalizeTargetItems(
      suppliedTargets ||
      template.targets ||
      []
    );

  return {
    id:
      target?.id ||
      `RBT-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`,

    type:
      "PORTFOLIO_REBALANCE_TARGET",

    profileType,

    profileLabel:
      target?.profileLabel ||
      template.label ||
      profileType,

    description:
      target?.description ||
      template.description ||
      null,

    mode,

    targets,

    targetTotalPercentage:
      totalPercentage(
        targets
      ),

    tolerancePercentage:
      roundPercent(
        target
          ?.tolerancePercentage ??
        template
          ?.tolerancePercentage ??
        3
      ),

    minimumTradeValue:
      Number(
        target
          ?.minimumTradeValue ||
        0
      ),

    preserveCashFloor:
      Number(
        target
          ?.preserveCashFloor ||
        0
      ),

    status:
      target?.status ||
      "ACTIVE",

    source:
      target?.source ||
      (
        profileType ===
        REBALANCE_PROFILE_TYPES
          .CUSTOM
          ? "CUSTOM_TARGET"
          : "ALLOCATION_TEMPLATE"
      ),

    notes:
      target?.notes ||
      null,

    metadata:
      target?.metadata &&
      typeof target.metadata ===
        "object"
        ? target.metadata
        : {},

    createdAt:
      target?.createdAt ||
      now,

    updatedAt:
      target?.updatedAt ||
      now
  };
}

function validateTarget(
  target
) {
  if (
    !target?.profileType
  ) {
    throw new Error(
      "Rebalance profile type is required."
    );
  }

  if (
    ![
      TARGET_ALLOCATION_MODES
        .ASSET_CLASS,

      TARGET_ALLOCATION_MODES
        .SYMBOL,

      TARGET_ALLOCATION_MODES
        .SECTOR
    ].includes(
      target?.mode
    )
  ) {
    throw new Error(
      "Invalid target allocation mode."
    );
  }

  if (
    !Array.isArray(
      target?.targets
    ) ||
    target.targets.length ===
      0
  ) {
    throw new Error(
      "At least one target allocation is required."
    );
  }

  const invalidTarget =
    target.targets.find(
      (item) =>
        !item?.key ||
        number(
          item?.percentage
        ) < 0 ||
        number(
          item?.percentage
        ) > 100
    );

  if (
    invalidTarget
  ) {
    throw new Error(
      "Each target allocation must have a key and a percentage between 0 and 100."
    );
  }

  const total =
    totalPercentage(
      target.targets
    );

  if (
    Math.abs(
      total -
      100
    ) > 0.01
  ) {
    throw new Error(
      `Target allocations must total 100%. Current total: ${total.toFixed(
        2
      )}%.`
    );
  }

  if (
    number(
      target
        ?.tolerancePercentage
    ) < 0
  ) {
    throw new Error(
      "Tolerance percentage cannot be negative."
    );
  }

  if (
    number(
      target
        ?.minimumTradeValue
    ) < 0
  ) {
    throw new Error(
      "Minimum trade value cannot be negative."
    );
  }

  if (
    number(
      target
        ?.preserveCashFloor
    ) < 0
  ) {
    throw new Error(
      "Cash floor cannot be negative."
    );
  }
}

/*
 * ============================================================
 * LOAD TARGET
 * ============================================================
 */

export async function loadRebalanceTarget() {
  const raw =
    await userGetItem(
      REBALANCE_TARGET_KEY
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

  return normalizeRebalanceTarget(
    parsed
  );
}

/*
 * ============================================================
 * SAVE TARGET
 * ============================================================
 */

export async function saveRebalanceTarget(
  target = {}
) {
  const current =
    await loadRebalanceTarget();

  const normalized =
    normalizeRebalanceTarget({
      ...current,
      ...target,

      id:
        target?.id ||
        current?.id ||
        undefined,

      createdAt:
        current?.createdAt ||
        target?.createdAt ||
        undefined,

      updatedAt:
        new Date()
          .toISOString()
    });

  validateTarget(
    normalized
  );

  await userSetItem(
    REBALANCE_TARGET_KEY,
    JSON.stringify(
      normalized
    )
  );

  return normalized;
}

/*
 * ============================================================
 * APPLY TEMPLATE
 * ============================================================
 */

export async function applyRebalanceTemplate(
  profileType,
  overrides = {}
) {
  const template =
    getAllocationTemplate(
      profileType
    );

  return saveRebalanceTarget({
    profileType:
      template.code,

    profileLabel:
      template.label,

    description:
      template.description,

    mode:
      template.mode,

    targets:
      template.targets,

    tolerancePercentage:
      overrides
        ?.tolerancePercentage ??
      template
        .tolerancePercentage,

    minimumTradeValue:
      overrides
        ?.minimumTradeValue ??
      0,

    preserveCashFloor:
      overrides
        ?.preserveCashFloor ??
      0,

    source:
      "ALLOCATION_TEMPLATE",

    notes:
      overrides?.notes ||
      null,

    metadata:
      {
        ...(overrides
          ?.metadata ||
          {}),

        appliedTemplate:
          template.code
      }
  });
}

/*
 * ============================================================
 * SAVE CUSTOM SYMBOL TARGET
 * ============================================================
 */

export async function saveCustomSymbolTarget({
  targets = [],
  tolerancePercentage = 3,
  minimumTradeValue = 0,
  preserveCashFloor = 0,
  notes = null
} = {}) {
  return saveRebalanceTarget({
    profileType:
      REBALANCE_PROFILE_TYPES
        .CUSTOM,

    profileLabel:
      "Custom Symbol Allocation",

    description:
      "User-defined target allocation by security symbol.",

    mode:
      TARGET_ALLOCATION_MODES
        .SYMBOL,

    targets:
      targets.map(
        (item) => ({
          key:
            normalizeKey(
              item?.symbol ||
              item?.key
            ),

          symbol:
            normalizeKey(
              item?.symbol ||
              item?.key
            ),

          label:
            item?.label ||
            item?.name ||
            item?.symbol ||
            item?.key,

          percentage:
            number(
              item?.percentage
            )
        })
      ),

    tolerancePercentage,

    minimumTradeValue,

    preserveCashFloor,

    source:
      "CUSTOM_TARGET",

    notes
  });
}

/*
 * ============================================================
 * SAVE CUSTOM SECTOR TARGET
 * ============================================================
 */

export async function saveCustomSectorTarget({
  targets = [],
  tolerancePercentage = 3,
  minimumTradeValue = 0,
  preserveCashFloor = 0,
  notes = null
} = {}) {
  return saveRebalanceTarget({
    profileType:
      REBALANCE_PROFILE_TYPES
        .CUSTOM,

    profileLabel:
      "Custom Sector Allocation",

    description:
      "User-defined target allocation by sector.",

    mode:
      TARGET_ALLOCATION_MODES
        .SECTOR,

    targets:
      targets.map(
        (item) => ({
          key:
            String(
              item?.sector ||
              item?.key ||
              ""
            ).trim(),

          sector:
            String(
              item?.sector ||
              item?.key ||
              ""
            ).trim(),

          label:
            item?.label ||
            item?.sector ||
            item?.key,

          percentage:
            number(
              item?.percentage
            )
        })
      ),

    tolerancePercentage,

    minimumTradeValue,

    preserveCashFloor,

    source:
      "CUSTOM_TARGET",

    notes
  });
}

/*
 * ============================================================
 * SAVE CUSTOM ASSET-CLASS TARGET
 * ============================================================
 */

export async function saveCustomAssetClassTarget({
  equityPercentage,
  cashPercentage,
  tolerancePercentage = 3,
  minimumTradeValue = 0,
  preserveCashFloor = 0,
  notes = null
} = {}) {
  return saveRebalanceTarget({
    profileType:
      REBALANCE_PROFILE_TYPES
        .CUSTOM,

    profileLabel:
      "Custom Asset Class Allocation",

    description:
      "User-defined target allocation between equity and cash.",

    mode:
      TARGET_ALLOCATION_MODES
        .ASSET_CLASS,

    targets: [
      {
        key:
          "EQUITY",

        assetClass:
          "EQUITY",

        label:
          "Equity",

        percentage:
          number(
            equityPercentage
          )
      },

      {
        key:
          "CASH",

        assetClass:
          "CASH",

        label:
          "Cash",

        percentage:
          number(
            cashPercentage
          )
      }
    ],

    tolerancePercentage,

    minimumTradeValue,

    preserveCashFloor,

    source:
      "CUSTOM_TARGET",

    notes
  });
}

/*
 * ============================================================
 * CLEAR TARGET
 * ============================================================
 */

export async function clearRebalanceTarget() {
  await userSetItem(
    REBALANCE_TARGET_KEY,
    JSON.stringify(
      null
    )
  );

  return true;
}

/*
 * ============================================================
 * TARGET MAP
 * ============================================================
 */

export async function buildTargetAllocationMap() {
  const target =
    await loadRebalanceTarget();

  if (
    !target
  ) {
    return new Map();
  }

  return new Map(
    target.targets.map(
      (item) => [
        item.key,
        {
          ...item
        }
      ]
    )
  );
}

/*
 * ============================================================
 * GET OR CREATE DEFAULT
 * ============================================================
 */

export async function getOrCreateRebalanceTarget() {
  const existing =
    await loadRebalanceTarget();

  if (
    existing
  ) {
    return existing;
  }

  return applyRebalanceTemplate(
    REBALANCE_PROFILE_TYPES
      .BALANCED
  );
}