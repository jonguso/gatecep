import {
  buildBrokerReconciliation
} from "./brokerReconciliationService";

import {
  loadBrokerResolutionLedger
} from "./brokerResolutionLedgerStore";

import {
  createBrokerReconciliationCase,
  getActiveBrokerReconciliationCase,
  getLatestBrokerReconciliationCase,
  loadBrokerReconciliationCases,
  updateBrokerReconciliationCase
} from "./brokerReconciliationCaseStore";

/*
 * ============================================================
 * PC-012
 * BROKER RECONCILIATION CASE WORKFLOW
 * ============================================================
 *
 * Important rules:
 *
 * 1. An active OPEN / PARTIALLY_RESOLVED case is reused.
 *
 * 2. A RESOLVED case is never reopened.
 *
 * 3. If the current physical reconciliation is identical
 *    to the most recently resolved case, reuse that resolved
 *    historical case.
 *
 * 4. If the broker/reconciliation state materially changes
 *    after a resolved case, create a NEW OPEN case.
 *
 * 5. Old resolution decisions are NOT automatically inherited
 *    into a newly created case.
 */

/*
 * ============================================================
 * BUILD WORKFLOW
 * ============================================================
 */

export async function buildBrokerReconciliationCaseWorkflow() {
  const reconciliation =
    await buildBrokerReconciliation();

  const discrepancies =
    buildPhysicalDiscrepancies(
      reconciliation
    );

  /*
   * ==========================================================
   * NO CURRENT DISCREPANCIES
   * ==========================================================
   */

  if (!discrepancies.length) {
    return {
      generatedAt:
        new Date().toISOString(),

      workflowStatus:
        reconciliation?.status === "CASH_EVIDENCE_REQUIRED"
          ? "EVIDENCE_REQUIRED"
          : "IN_SYNC",

      case:
        null,

      reconciliation,

      discrepancies: [],

      caseAction:
        "NO_CASE_REQUIRED",

      summary: {
        totalIssues: 0,
        resolvedIssues: 0,
        openIssues: 0
      }
    };
  }

  /*
   * ==========================================================
   * CURRENT RECONCILIATION FINGERPRINT
   * ==========================================================
   */

  const reconciliationFingerprint =
    buildReconciliationFingerprint({
      reconciliation,
      discrepancies
    });

  /*
   * ==========================================================
   * ACTIVE CASE
   * ==========================================================
   *
   * If a case is already OPEN or PARTIALLY_RESOLVED,
   * continue using it.
   */

  const activeCase =
    await getActiveBrokerReconciliationCase();

  if (activeCase) {
  let updatedCase =
    await updateActiveCase({
      activeCase,
      reconciliation,
      discrepancies,
      reconciliationFingerprint
    });

  /*
   * PC-012 migration bridge.
   *
   * PC-010 / PC-011 existed before case management.
   * Allow their existing decisions to be attached to the
   * FIRST reconciliation case only.
   *
   * Future cases must start with fresh resolution state.
   */
  updatedCase =
    await bootstrapLegacyResolutions({
      currentCase:
        updatedCase
    });

  return buildWorkflowResponse({
    reconciliation,
    discrepancies:
      updatedCase?.issues ||
      discrepancies,

    currentCase:
      updatedCase,

    caseAction:
      "UPDATED_ACTIVE_CASE"
  });
}

  /*
   * ==========================================================
   * MOST RECENT HISTORICAL CASE
   * ==========================================================
   */

  const latestCase =
    await getLatestBrokerReconciliationCase();

  /*
   * ==========================================================
   * SAME STATE AS RESOLVED CASE
   * ==========================================================
   *
   * Critical rollover protection:
   *
   * If BRC-001 was resolved while the physical broker
   * reconciliation remained PARTIAL_MATCH, simply reopening
   * the screen must NOT generate BRC-002.
   */

  if (
    latestCase?.status ===
      "RESOLVED"
  ) {
    const latestFingerprint =
      latestCase
        ?.reconciliationFingerprint ||
      buildCaseFingerprint(
        latestCase
      );

    if (
      latestFingerprint ===
      reconciliationFingerprint
    ) {
      /*
       * Backfill fingerprint for older cases that were
       * created before fingerprint support existed.
       */
      let resolvedCase =
        latestCase;

      if (
        !latestCase
          ?.reconciliationFingerprint
      ) {
        resolvedCase =
          await updateBrokerReconciliationCase(
            latestCase.id,
            {
              reconciliationFingerprint
            }
          );
      }

      return buildWorkflowResponse({
        reconciliation,
        discrepancies:
          resolvedCase?.issues ||
          discrepancies,

        currentCase:
          resolvedCase,

        caseAction:
          "REUSED_RESOLVED_CASE"
      });
    }
  }

  /*
   * ==========================================================
   * NEW RECONCILIATION CYCLE
   * ==========================================================
   *
   * No active case exists and the reconciliation fingerprint
   * differs from the last resolved case.
   *
   * Create a brand-new OPEN case.
   *
   * Do not copy previous resolution decisions into this case.
   */

  const newCase =
    await createNewCase({
      reconciliation,
      discrepancies,
      reconciliationFingerprint
    });

  return buildWorkflowResponse({
    reconciliation,
    discrepancies,

    currentCase:
      newCase,

    caseAction:
      "CREATED_NEW_CASE"
  });
}

/*
 * ============================================================
 * BUILD PHYSICAL DISCREPANCIES
 * ============================================================
 *
 * This deliberately reads ONLY the current reconciliation.
 *
 * It does not read brokerResolutionStore or the old resolution
 * ledger because a new reconciliation case must begin from the
 * physical broker state.
 */

function buildPhysicalDiscrepancies(
  reconciliation
) {
  const holdings =
    Array.isArray(
      reconciliation?.holdings
    )
      ? reconciliation.holdings
      : [];

  const discrepancies = [];

  holdings.forEach(
    (holding) => {
      if (
        holding?.status ===
        "MATCHED"
      ) {
        return;
      }

      const discrepancyType =
        holding?.status ||
        "UNKNOWN";

      const symbol =
        holding?.symbol ||
        null;

      const discrepancyKey =
        `${discrepancyType}:${
          symbol || "ACCOUNT"
        }`;

      discrepancies.push({
        discrepancyKey,

        symbol,

        discrepancyType,

        gatecepQuantity:
          Number(
            holding
              ?.real
              ?.quantity ||
            0
          ),

        brokerQuantity:
          Number(
            holding
              ?.broker
              ?.quantity ||
            0
          ),

        gatecepValue:
          roundMoney(
            holding
              ?.real
              ?.marketValue ||
            0
          ),

        brokerValue:
          roundMoney(
            holding
              ?.broker
              ?.marketValue ||
            0
          ),

        /*
         * A genuinely new case starts OPEN.
         */
        resolutionCode:
          null,

        resolutionLabel:
          null,

        resolutionDecisionId:
          null,

        resolutionStatus:
          "OPEN",

        resolvedAt:
          null
      });
    }
  );

  /*
   * ==========================================================
   * CASH MISMATCH
   * ==========================================================
   */

  const cashDifference =
    roundMoney(
      reconciliation
        ?.summary
        ?.cashDifference ||
      0
    );

  if (
    reconciliation?.summary?.cashEvidenceAvailable === true &&
    Math.abs(
      cashDifference
    ) >= 0.01
  ) {
    discrepancies.push({
      discrepancyKey:
        "CASH_MISMATCH:ACCOUNT",

      symbol:
        null,

      discrepancyType:
        "CASH_MISMATCH",

      gatecepQuantity:
        0,

      brokerQuantity:
        0,

      gatecepValue:
        roundMoney(
          reconciliation
            ?.realPortfolio
            ?.availableCash ||
          0
        ),

      brokerValue:
        roundMoney(
          reconciliation
            ?.brokerMirror
            ?.cashBalance ||
          0
        ),

      resolutionCode:
        null,

      resolutionLabel:
        null,

      resolutionDecisionId:
        null,

      resolutionStatus:
        "OPEN",

      resolvedAt:
        null
    });
  }

  return discrepancies;
}

/*
 * ============================================================
 * CREATE NEW CASE
 * ============================================================
 */

async function createNewCase({
  reconciliation,
  discrepancies,
  reconciliationFingerprint
}) {
  return createBrokerReconciliationCase({
    broker:
      reconciliation
        ?.brokerMirror
        ?.broker ||
      null,

    accountName:
      reconciliation
        ?.brokerMirror
        ?.accountName ||
      null,

    currency:
      "KES",

    initialReconciliationStatus:
      reconciliation?.status ||
      null,

    latestReconciliationStatus:
      reconciliation?.status ||
      null,

    reconciliationFingerprint,

    brokerTotal:
      roundMoney(
        reconciliation
          ?.brokerMirror
          ?.totalValue ||
        0
      ),

    gatecepTotal:
      roundMoney(
        reconciliation
          ?.realPortfolio
          ?.totalValue ||
        0
      ),

    difference:
      roundMoney(
        reconciliation
          ?.summary
          ?.totalDifference ||
        0
      ),

    cashDifference:
      roundMoney(
        reconciliation
          ?.summary
          ?.cashDifference ||
        0
      ),

    matched:
      Number(
        reconciliation
          ?.summary
          ?.matched ||
        0
      ),

    mismatched:
      Number(
        reconciliation
          ?.summary
          ?.mismatched ||
        discrepancies.length
      ),

    issues:
      discrepancies
  });
}

/*
 * ============================================================
 * UPDATE ACTIVE CASE
 * ============================================================
 *
 * An OPEN case stays the same case while the investor works
 * through that reconciliation cycle.
 *
 * Existing issue resolution state is preserved where the same
 * discrepancy still exists.
 */

async function updateActiveCase({
  activeCase,
  reconciliation,
  discrepancies,
  reconciliationFingerprint
}) {
  const existingIssueMap =
    new Map(
      (
        activeCase?.issues ||
        []
      ).map(
        (issue) => [
          issue?.discrepancyKey ||
          buildIssueKey(
            issue
          ),

          issue
        ]
      )
    );

  const mergedIssues =
    discrepancies.map(
      (incoming) => {
        const existing =
          existingIssueMap.get(
            incoming
              .discrepancyKey
          );

        if (!existing) {
          return incoming;
        }

        return {
          ...incoming,

          /*
           * Preserve the human resolution made during this
           * active case.
           */

          resolutionCode:
            existing
              ?.resolutionCode ||
            null,

          resolutionLabel:
            existing
              ?.resolutionLabel ||
            null,

          resolutionDecisionId:
            existing
              ?.resolutionDecisionId ||
            null,

          resolutionStatus:
            existing
              ?.resolutionStatus ||
            "OPEN",

          resolvedAt:
            existing
              ?.resolvedAt ||
            null
        };
      }
    );

  return updateBrokerReconciliationCase(
    activeCase.id,
    {
      broker:
        reconciliation
          ?.brokerMirror
          ?.broker ||
        activeCase?.broker ||
        null,

      accountName:
        reconciliation
          ?.brokerMirror
          ?.accountName ||
        activeCase
          ?.accountName ||
        null,

      latestReconciliationStatus:
        reconciliation?.status ||
        null,

      reconciliationFingerprint,

      brokerTotal:
        roundMoney(
          reconciliation
            ?.brokerMirror
            ?.totalValue ||
          0
        ),

      gatecepTotal:
        roundMoney(
          reconciliation
            ?.realPortfolio
            ?.totalValue ||
          0
        ),

      difference:
        roundMoney(
          reconciliation
            ?.summary
            ?.totalDifference ||
          0
        ),

      cashDifference:
        roundMoney(
          reconciliation
            ?.summary
            ?.cashDifference ||
          0
        ),

      matched:
        Number(
          reconciliation
            ?.summary
            ?.matched ||
          0
        ),

      mismatched:
        Number(
          reconciliation
            ?.summary
            ?.mismatched ||
          0
        ),

      issues:
        mergedIssues
    }
  );
}

/*
 * ============================================================
 * RECONCILIATION FINGERPRINT
 * ============================================================
 *
 * This represents the physical broker-vs-GateCEP state.
 *
 * It intentionally excludes:
 *
 * resolution labels
 * resolved timestamps
 * case status
 *
 * because those are human workflow state, not physical
 * reconciliation state.
 */

function buildReconciliationFingerprint({
  reconciliation,
  discrepancies
}) {
  const normalizedIssues =
    [...discrepancies]
      .map(
        (issue) => ({
          discrepancyKey:
            issue
              ?.discrepancyKey ||
            buildIssueKey(
              issue
            ),

          symbol:
            issue?.symbol ||
            null,

          discrepancyType:
            issue
              ?.discrepancyType ||
            null,

          gatecepQuantity:
            Number(
              issue
                ?.gatecepQuantity ||
              0
            ),

          brokerQuantity:
            Number(
              issue
                ?.brokerQuantity ||
              0
            ),

          gatecepValue:
            roundMoney(
              issue
                ?.gatecepValue ||
              0
            ),

          brokerValue:
            roundMoney(
              issue
                ?.brokerValue ||
              0
            )
        })
      )
      .sort(
        (a, b) =>
          String(
            a.discrepancyKey
          ).localeCompare(
            String(
              b.discrepancyKey
            )
          )
      );

  return JSON.stringify({
    broker:
      reconciliation
        ?.brokerMirror
        ?.broker ||
      null,

    accountName:
      reconciliation
        ?.brokerMirror
        ?.accountName ||
      null,

    status:
      reconciliation?.status ||
      null,

    brokerTotal:
      roundMoney(
        reconciliation
          ?.brokerMirror
          ?.totalValue ||
        0
      ),

    gatecepTotal:
      roundMoney(
        reconciliation
          ?.realPortfolio
          ?.totalValue ||
        0
      ),

    difference:
      roundMoney(
        reconciliation
          ?.summary
          ?.totalDifference ||
        0
      ),

    cashDifference:
      roundMoney(
        reconciliation
          ?.summary
          ?.cashDifference ||
        0
      ),

    matched:
      Number(
        reconciliation
          ?.summary
          ?.matched ||
        0
      ),

    mismatched:
      Number(
        reconciliation
          ?.summary
          ?.mismatched ||
        0
      ),

    issues:
      normalizedIssues
  });
}

/*
 * ============================================================
 * LEGACY CASE FINGERPRINT
 * ============================================================
 *
 * Allows the existing BRC-001 case created before fingerprint
 * support to be compared with today's reconciliation.
 */

function buildCaseFingerprint(
  currentCase
) {
  const issues =
    Array.isArray(
      currentCase?.issues
    )
      ? currentCase.issues
      : [];

  const normalizedIssues =
    [...issues]
      .map(
        (issue) => ({
          discrepancyKey:
            issue
              ?.discrepancyKey ||
            buildIssueKey(
              issue
            ),

          symbol:
            issue?.symbol ||
            null,

          discrepancyType:
            issue
              ?.discrepancyType ||
            null,

          gatecepQuantity:
            Number(
              issue
                ?.gatecepQuantity ||
              0
            ),

          brokerQuantity:
            Number(
              issue
                ?.brokerQuantity ||
              0
            ),

          gatecepValue:
            roundMoney(
              issue
                ?.gatecepValue ||
              0
            ),

          brokerValue:
            roundMoney(
              issue
                ?.brokerValue ||
              0
            )
        })
      )
      .sort(
        (a, b) =>
          String(
            a.discrepancyKey
          ).localeCompare(
            String(
              b.discrepancyKey
            )
          )
      );

  return JSON.stringify({
    broker:
      currentCase?.broker ||
      null,

    accountName:
      currentCase
        ?.accountName ||
      null,

    status:
      currentCase
        ?.latestReconciliationStatus ||
      null,

    brokerTotal:
      roundMoney(
        currentCase
          ?.brokerTotal ||
        0
      ),

    gatecepTotal:
      roundMoney(
        currentCase
          ?.gatecepTotal ||
        0
      ),

    difference:
      roundMoney(
        currentCase
          ?.difference ||
        0
      ),

    cashDifference:
      roundMoney(
        currentCase
          ?.cashDifference ||
        0
      ),

    matched:
      Number(
        currentCase?.matched ||
        0
      ),

    mismatched:
      Number(
        currentCase
          ?.mismatched ||
        0
      ),

    issues:
      normalizedIssues
  });
}

/*
 * ============================================================
 * RESPONSE
 * ============================================================
 */

/*
 * ============================================================
 * ONE-TIME LEGACY RESOLUTION BOOTSTRAP
 * ============================================================
 *
 * PC-010 and PC-011 were created before PC-012.
 *
 * Existing ledger decisions may be attached to the very first
 * reconciliation case so we do not ask the investor to resolve
 * COOP and EABL again.
 *
 * Once more than one case exists, this migration is disabled.
 * Therefore BRC-002, BRC-003, etc. never inherit stale
 * resolutions from previous reconciliation cycles.
 */

async function bootstrapLegacyResolutions({
  currentCase
}) {
  if (!currentCase) {
    return currentCase;
  }

  const cases =
    await loadBrokerReconciliationCases();

  /*
   * Migration is allowed only while exactly one reconciliation
   * case exists for the user.
   */
  if (
    !Array.isArray(cases) ||
    cases.length !== 1
  ) {
    return currentCase;
  }

  if (
    cases[0]?.id !==
    currentCase.id
  ) {
    return currentCase;
  }

  /*
   * Never overwrite decisions already recorded directly
   * against the case.
   */
  const alreadyHasResolution =
    (
      currentCase?.issues ||
      []
    ).some(
      (issue) =>
        issue?.resolutionStatus ===
        "RESOLVED" ||
        Boolean(
          issue?.resolutionDecisionId
        )
    );

  if (alreadyHasResolution) {
    return currentCase;
  }

  const ledger =
    await loadBrokerResolutionLedger();

  if (
    !Array.isArray(ledger) ||
    !ledger.length
  ) {
    return currentCase;
  }

  /*
   * The ledger is newest-first.
   *
   * Keep only the newest decision for each discrepancy.
   */
  const ledgerMap =
    new Map();

  ledger.forEach(
    (entry) => {
      if (
        !entry?.discrepancyKey ||
        ledgerMap.has(
          entry.discrepancyKey
        )
      ) {
        return;
      }

      ledgerMap.set(
        entry.discrepancyKey,
        entry
      );
    }
  );

  let changed =
    false;

  const issues =
    (
      currentCase?.issues ||
      []
    ).map(
      (issue) => {
        const key =
          issue?.discrepancyKey ||
          buildIssueKey(
            issue
          );

        const decision =
          ledgerMap.get(
            key
          );

        if (!decision) {
          return issue;
        }

        /*
         * Protect against attaching a decision for a different
         * physical position.
         */
        const sameGatecepQuantity =
          Number(
            decision?.gatecepQuantity ||
            0
          ) ===
          Number(
            issue?.gatecepQuantity ||
            0
          );

        const sameBrokerQuantity =
          Number(
            decision?.brokerQuantity ||
            0
          ) ===
          Number(
            issue?.brokerQuantity ||
            0
          );

        if (
          !sameGatecepQuantity ||
          !sameBrokerQuantity
        ) {
          return issue;
        }

        changed =
          true;

        return {
          ...issue,

          resolutionCode:
            decision
              ?.resolutionCode ||
            null,

          resolutionLabel:
            decision
              ?.resolutionLabel ||
            null,

          resolutionDecisionId:
            decision?.id ||
            null,

          resolutionStatus:
            decision?.status ===
            "RESOLVED"
              ? "RESOLVED"
              : "OPEN",

          resolvedAt:
            decision?.createdAt ||
            null
        };
      }
    );

  if (!changed) {
    return currentCase;
  }

  return updateBrokerReconciliationCase(
    currentCase.id,
    {
      issues,

      legacyResolutionBootstrap:
        true,

      legacyResolutionBootstrappedAt:
        new Date().toISOString()
    }
  );
}

function buildWorkflowResponse({
  reconciliation,
  discrepancies,
  currentCase,
  caseAction
}) {
  return {
    generatedAt:
      new Date().toISOString(),

    workflowStatus:
      currentCase?.status ||
      "OPEN",

    case:
      currentCase,

    reconciliation,

    discrepancies,

    caseAction,

    summary: {
      totalIssues:
        currentCase
          ?.issueCount ||
        0,

      resolvedIssues:
        currentCase
          ?.resolvedCount ||
        0,

      openIssues:
        currentCase
          ?.openCount ||
        0
    }
  };
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function buildIssueKey(
  issue = {}
) {
  return `${issue?.discrepancyType || "UNKNOWN"}:${
    issue?.symbol || "ACCOUNT"
  }`;
}

function roundMoney(value) {
  const parsed =
    Number(value || 0);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return 0;
  }

  return Number(
    parsed.toFixed(2)
  );
}
