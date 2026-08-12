import {
  buildCurrentPortfolioAllocation
} from "./allocationEngine";

import {
  getOrCreateRebalanceTarget
} from "./rebalanceStore";

import {
  TARGET_ALLOCATION_MODES
} from "./allocationTemplates";

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

function roundMoney(value) {
  return Number(
    number(value).toFixed(2)
  );
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

function normalizeSector(value) {
  return String(
    value ||
    "Unknown"
  ).trim();
}

function classifyDrift({
  driftPercentage,
  tolerancePercentage
}) {
  const drift =
    number(
      driftPercentage
    );

  const tolerance =
    Math.abs(
      number(
        tolerancePercentage
      )
    );

  if (
    Math.abs(
      drift
    ) <=
    tolerance
  ) {
    return "WITHIN_TOLERANCE";
  }

  if (
    drift > 0
  ) {
    return "OVERWEIGHT";
  }

  return "UNDERWEIGHT";
}

function buildEmptyAnalysis({
  allocation,
  target,
  message
}) {
  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      "NOT_READY",

    message,

    allocation,

    target,

    mode:
      target?.mode ||
      null,

    tolerancePercentage:
      number(
        target
          ?.tolerancePercentage
      ),

    portfolioValue:
      number(
        allocation
          ?.portfolio
          ?.totalValue
      ),

    items:
      [],

    summary: {
      totalItems:
        0,

      overweight:
        0,

      underweight:
        0,

      withinTolerance:
        0,

      totalAbsoluteDrift:
        0,

      largestAbsoluteDrift:
        0,

      largestDriftItem:
        null,

      valueToSell:
        0,

      valueToBuy:
        0,

      netValueDifference:
        0,

      targetTotalPercentage:
        number(
          target
            ?.targetTotalPercentage
        ),

      currentTotalPercentage:
        0
    }
  };
}

/*
 * ============================================================
 * PC-019C
 * DRIFT ANALYSIS
 * ============================================================
 *
 * Compares the current portfolio allocation from PC-019A
 * against the saved target allocation from PC-019B.
 *
 * Supported target modes:
 *
 * ASSET_CLASS
 * SYMBOL
 * SECTOR
 *
 * This service does not create trades or modify holdings.
 */

export async function buildPortfolioDriftAnalysis() {
  const [
    allocation,
    target
  ] = await Promise.all([
    buildCurrentPortfolioAllocation(),
    getOrCreateRebalanceTarget()
  ]);

  if (
    !allocation ||
    allocation?.status ===
      "NO_PORTFOLIO" ||
    allocation?.status ===
      "EMPTY_PORTFOLIO"
  ) {
    return buildEmptyAnalysis({
      allocation,
      target,
      message:
        "A funded real portfolio is required before drift can be calculated."
    });
  }

  if (
    !target ||
    !Array.isArray(
      target?.targets
    ) ||
    target.targets.length ===
      0
  ) {
    return buildEmptyAnalysis({
      allocation,
      target,
      message:
        "A target allocation is required before drift can be calculated."
    });
  }

  const mode =
    target?.mode;

  const portfolioValue =
    roundMoney(
      allocation
        ?.portfolio
        ?.totalValue
    );

  const tolerancePercentage =
    roundPercent(
      target
        ?.tolerancePercentage
    );

  let currentItems = [];

  switch (
    mode
  ) {
    case TARGET_ALLOCATION_MODES
      .ASSET_CLASS:
      currentItems =
        buildCurrentAssetClassItems(
          allocation
        );
      break;

    case TARGET_ALLOCATION_MODES
      .SYMBOL:
      currentItems =
        buildCurrentSymbolItems(
          allocation
        );
      break;

    case TARGET_ALLOCATION_MODES
      .SECTOR:
      currentItems =
        buildCurrentSectorItems(
          allocation
        );
      break;

    default:
      return buildEmptyAnalysis({
        allocation,
        target,
        message:
          "The saved target allocation mode is not supported."
      });
  }

  const currentMap =
    new Map(
      currentItems.map(
        (item) => [
          item.key,
          item
        ]
      )
    );

  const targetMap =
    new Map(
      target.targets.map(
        (item) => [
          normalizeTargetKey({
            item,
            mode
          }),
          item
        ]
      )
    );

  const allKeys =
    Array.from(
      new Set([
        ...currentMap.keys(),
        ...targetMap.keys()
      ])
    );

  const items =
    allKeys
      .map(
        (key) => {
          const current =
            currentMap.get(
              key
            ) || {
              key,
              label:
                key,
              currentValue:
                0,
              currentPercentage:
                0,
              metadata:
                {}
            };

          const targetItem =
            targetMap.get(
              key
            ) || {
              key,
              label:
                current.label ||
                key,
              percentage:
                0
            };

          const currentPercentage =
            roundPercent(
              current
                ?.currentPercentage
            );

          const targetPercentage =
            roundPercent(
              targetItem
                ?.percentage
            );

          const driftPercentage =
            roundPercent(
              currentPercentage -
              targetPercentage
            );

          const currentValue =
            roundMoney(
              current
                ?.currentValue
            );

          const targetValue =
            roundMoney(
              portfolioValue *
              (
                targetPercentage /
                100
              )
            );

          /*
           * Positive valueDifference means the current position
           * exceeds target and value should eventually be sold.
           *
           * Negative means the position is under target and
           * value should eventually be bought.
           */
          const valueDifference =
            roundMoney(
              currentValue -
              targetValue
            );

          const absoluteDrift =
            roundPercent(
              Math.abs(
                driftPercentage
              )
            );

          const classification =
            classifyDrift({
              driftPercentage,
              tolerancePercentage
            });

          return {
            key,

            label:
              targetItem?.label ||
              current?.label ||
              key,

            mode,

            currentPercentage,

            targetPercentage,

            driftPercentage,

            absoluteDrift,

            currentValue,

            targetValue,

            valueDifference,

            action:
              classification ===
                "OVERWEIGHT"
                ? "REDUCE"
                : classification ===
                  "UNDERWEIGHT"
                ? "INCREASE"
                : "HOLD",

            classification,

            withinTolerance:
              classification ===
              "WITHIN_TOLERANCE",

            tolerancePercentage,

            metadata: {
              ...(
                current?.metadata &&
                typeof current.metadata ===
                  "object"
                  ? current.metadata
                  : {}
              ),

              targetSymbol:
                targetItem?.symbol ||
                null,

              targetSector:
                targetItem?.sector ||
                null,

              targetAssetClass:
                targetItem?.assetClass ||
                null
            }
          };
        }
      )
      .sort(
        (a, b) =>
          b.absoluteDrift -
          a.absoluteDrift
      );

  const overweightItems =
    items.filter(
      (item) =>
        item?.classification ===
        "OVERWEIGHT"
    );

  const underweightItems =
    items.filter(
      (item) =>
        item?.classification ===
        "UNDERWEIGHT"
    );

  const withinToleranceItems =
    items.filter(
      (item) =>
        item?.classification ===
        "WITHIN_TOLERANCE"
    );

  const totalAbsoluteDrift =
    roundPercent(
      items.reduce(
        (sum, item) =>
          sum +
          number(
            item?.absoluteDrift
          ),
        0
      )
    );

  const valueToSell =
    roundMoney(
      overweightItems.reduce(
        (sum, item) =>
          sum +
          Math.max(
            number(
              item?.valueDifference
            ),
            0
          ),
        0
      )
    );

  const valueToBuy =
    roundMoney(
      underweightItems.reduce(
        (sum, item) =>
          sum +
          Math.max(
            -number(
              item?.valueDifference
            ),
            0
          ),
        0
      )
    );

  const currentTotalPercentage =
    roundPercent(
      items.reduce(
        (sum, item) =>
          sum +
          number(
            item
              ?.currentPercentage
          ),
        0
      )
    );

  const targetTotalPercentage =
    roundPercent(
      items.reduce(
        (sum, item) =>
          sum +
          number(
            item
              ?.targetPercentage
          ),
        0
      )
    );

  const largestDriftItem =
    items[0] ||
    null;

  const rebalancingRequired =
    overweightItems.length >
      0 ||
    underweightItems.length >
      0;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      rebalancingRequired
        ? "REBALANCING_REQUIRED"
        : "WITHIN_TOLERANCE",

    message:
      rebalancingRequired
        ? `${overweightItems.length} allocation item(s) are overweight and ${underweightItems.length} are underweight.`
        : "The portfolio is currently within the saved target tolerance.",

    allocation,

    target,

    mode,

    tolerancePercentage,

    portfolioValue,

    items,

    summary: {
      totalItems:
        items.length,

      overweight:
        overweightItems.length,

      underweight:
        underweightItems.length,

      withinTolerance:
        withinToleranceItems.length,

      totalAbsoluteDrift,

      largestAbsoluteDrift:
        largestDriftItem
          ?.absoluteDrift ||
        0,

      largestDriftItem:
        largestDriftItem
          ? {
              key:
                largestDriftItem.key,

              label:
                largestDriftItem.label,

              classification:
                largestDriftItem
                  .classification,

              driftPercentage:
                largestDriftItem
                  .driftPercentage,

              currentPercentage:
                largestDriftItem
                  .currentPercentage,

              targetPercentage:
                largestDriftItem
                  .targetPercentage,

              valueDifference:
                largestDriftItem
                  .valueDifference
            }
          : null,

      valueToSell,

      valueToBuy,

      netValueDifference:
        roundMoney(
          valueToSell -
          valueToBuy
        ),

      targetTotalPercentage,

      currentTotalPercentage
    }
  };
}

/*
 * ============================================================
 * CURRENT ASSET CLASS ITEMS
 * ============================================================
 */

function buildCurrentAssetClassItems(
  allocation
) {
  const assetClasses =
    Array.isArray(
      allocation
        ?.assetClasses
    )
      ? allocation.assetClasses
      : [];

  return assetClasses.map(
    (item) => ({
      key:
        normalizeKey(
          item?.key
        ),

      label:
        item?.label ||
        item?.key ||
        "Unknown",

      currentValue:
        roundMoney(
          item?.value
        ),

      currentPercentage:
        roundPercent(
          item?.percentage
        ),

      metadata: {
        assetClass:
          normalizeKey(
            item?.key
          )
      }
    })
  );
}

/*
 * ============================================================
 * CURRENT SYMBOL ITEMS
 * ============================================================
 */

function buildCurrentSymbolItems(
  allocation
) {
  const holdings =
    Array.isArray(
      allocation
        ?.holdings
    )
      ? allocation.holdings
      : [];

  const symbolItems =
    holdings.map(
      (holding) => ({
        key:
          normalizeKey(
            holding?.symbol
          ),

        label:
          holding?.name ||
          holding?.symbol ||
          "Unknown",

        currentValue:
          roundMoney(
            holding
              ?.marketValue
          ),

        currentPercentage:
          roundPercent(
            holding
              ?.allocationPercentage
          ),

        metadata: {
          symbol:
            normalizeKey(
              holding?.symbol
            ),

          sector:
            holding?.sector ||
            null,

          quantity:
            number(
              holding?.quantity
            ),

          marketPrice:
            roundMoney(
              holding
                ?.marketPrice
            )
        }
      })
    );

  /*
   * Cash remains a valid allocation target in symbol mode.
   */
  symbolItems.push({
    key:
      "CASH",

    label:
      "Cash",

    currentValue:
      roundMoney(
        allocation
          ?.portfolio
          ?.availableCash
      ),

    currentPercentage:
      roundPercent(
        allocation
          ?.concentration
          ?.cashPercentage
      ),

    metadata: {
      assetClass:
        "CASH"
    }
  });

  return symbolItems;
}

/*
 * ============================================================
 * CURRENT SECTOR ITEMS
 * ============================================================
 */

function buildCurrentSectorItems(
  allocation
) {
  const sectors =
    Array.isArray(
      allocation
        ?.sectors
    )
      ? allocation.sectors
      : [];

  const sectorItems =
    sectors.map(
      (sector) => ({
        key:
          normalizeSectorKey(
            sector?.sector
          ),

        label:
          sector?.sector ||
          "Unknown",

        currentValue:
          roundMoney(
            sector?.value
          ),

        currentPercentage:
          roundPercent(
            sector?.percentage
          ),

        metadata: {
          sector:
            sector?.sector ||
            "Unknown",

          holdingsCount:
            number(
              sector
                ?.holdingsCount
            ),

          symbols:
            Array.isArray(
              sector?.symbols
            )
              ? sector.symbols
              : []
        }
      })
    );

  /*
   * Cash is represented separately from equity sectors.
   */
  sectorItems.push({
    key:
      "CASH",

    label:
      "Cash",

    currentValue:
      roundMoney(
        allocation
          ?.portfolio
          ?.availableCash
      ),

    currentPercentage:
      roundPercent(
        allocation
          ?.concentration
          ?.cashPercentage
      ),

    metadata: {
      assetClass:
        "CASH"
    }
  });

  return sectorItems;
}

/*
 * ============================================================
 * TARGET KEY NORMALIZATION
 * ============================================================
 */

function normalizeTargetKey({
  item,
  mode
}) {
  switch (
    mode
  ) {
    case TARGET_ALLOCATION_MODES
      .ASSET_CLASS:
      return normalizeKey(
        item?.assetClass ||
        item?.key
      );

    case TARGET_ALLOCATION_MODES
      .SYMBOL:
      return normalizeKey(
        item?.symbol ||
        item?.key
      );

    case TARGET_ALLOCATION_MODES
      .SECTOR: {
      const raw =
        item?.sector ||
        item?.key;

      if (
        normalizeKey(
          raw
        ) ===
        "CASH"
      ) {
        return "CASH";
      }

      return normalizeSectorKey(
        raw
      );
    }

    default:
      return normalizeKey(
        item?.key
      );
  }
}

function normalizeSectorKey(
  value
) {
  return normalizeSector(
    value
  )
    .trim()
    .toUpperCase();
}

/*
 * ============================================================
 * CONVENIENCE FILTERS
 * ============================================================
 */

export async function loadOverweightAllocations() {
  const analysis =
    await buildPortfolioDriftAnalysis();

  return analysis.items.filter(
    (item) =>
      item?.classification ===
      "OVERWEIGHT"
  );
}

export async function loadUnderweightAllocations() {
  const analysis =
    await buildPortfolioDriftAnalysis();

  return analysis.items.filter(
    (item) =>
      item?.classification ===
      "UNDERWEIGHT"
  );
}

export async function loadAllocationsOutsideTolerance() {
  const analysis =
    await buildPortfolioDriftAnalysis();

  return analysis.items.filter(
    (item) =>
      !item?.withinTolerance
  );
}