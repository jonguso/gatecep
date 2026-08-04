export const REBALANCE_PROFILE_TYPES = {
  CONSERVATIVE:
    "CONSERVATIVE",

  BALANCED:
    "BALANCED",

  GROWTH:
    "GROWTH",

  AGGRESSIVE:
    "AGGRESSIVE",

  CUSTOM:
    "CUSTOM"
};

export const TARGET_ALLOCATION_MODES = {
  ASSET_CLASS:
    "ASSET_CLASS",

  SYMBOL:
    "SYMBOL",

  SECTOR:
    "SECTOR"
};

export const ALLOCATION_TEMPLATES = {
  CONSERVATIVE: {
    code:
      REBALANCE_PROFILE_TYPES
        .CONSERVATIVE,

    label:
      "Conservative",

    description:
      "Prioritizes liquidity and lower concentration while maintaining measured equity exposure.",

    mode:
      TARGET_ALLOCATION_MODES
        .ASSET_CLASS,

    targets: [
      {
        key:
          "EQUITY",

        label:
          "Equity",

        percentage:
          65
      },

      {
        key:
          "CASH",

        label:
          "Cash",

        percentage:
          35
      }
    ],

    tolerancePercentage:
      3
  },

  BALANCED: {
    code:
      REBALANCE_PROFILE_TYPES
        .BALANCED,

    label:
      "Balanced",

    description:
      "Balances long-term equity growth with a meaningful cash reserve.",

    mode:
      TARGET_ALLOCATION_MODES
        .ASSET_CLASS,

    targets: [
      {
        key:
          "EQUITY",

        label:
          "Equity",

        percentage:
          85
      },

      {
        key:
          "CASH",

        label:
          "Cash",

        percentage:
          15
      }
    ],

    tolerancePercentage:
      3
  },

  GROWTH: {
    code:
      REBALANCE_PROFILE_TYPES
        .GROWTH,

    label:
      "Growth",

    description:
      "Maintains high equity exposure with a smaller liquidity reserve.",

    mode:
      TARGET_ALLOCATION_MODES
        .ASSET_CLASS,

    targets: [
      {
        key:
          "EQUITY",

        label:
          "Equity",

        percentage:
          95
      },

      {
        key:
          "CASH",

        label:
          "Cash",

        percentage:
          5
      }
    ],

    tolerancePercentage:
      2
  },

  AGGRESSIVE: {
    code:
      REBALANCE_PROFILE_TYPES
        .AGGRESSIVE,

    label:
      "Aggressive",

    description:
      "Maximizes equity exposure while retaining only a minimal cash reserve.",

    mode:
      TARGET_ALLOCATION_MODES
        .ASSET_CLASS,

    targets: [
      {
        key:
          "EQUITY",

        label:
          "Equity",

        percentage:
          98
      },

      {
        key:
          "CASH",

        label:
          "Cash",

        percentage:
          2
      }
    ],

    tolerancePercentage:
      2
  },

  CUSTOM: {
    code:
      REBALANCE_PROFILE_TYPES
        .CUSTOM,

    label:
      "Custom",

    description:
      "A user-defined target allocation.",

    mode:
      TARGET_ALLOCATION_MODES
        .SYMBOL,

    targets:
      [],

    tolerancePercentage:
      3
  }
};

export function getAllocationTemplate(
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
    ALLOCATION_TEMPLATES[
      normalized
    ] ||
    ALLOCATION_TEMPLATES
      .BALANCED
  );
}

export function listAllocationTemplates() {
  return Object.values(
    ALLOCATION_TEMPLATES
  ).map(
    (template) => ({
      ...template,

      targets:
        Array.isArray(
          template?.targets
        )
          ? template.targets.map(
              (target) => ({
                ...target
              })
            )
          : []
    })
  );
}