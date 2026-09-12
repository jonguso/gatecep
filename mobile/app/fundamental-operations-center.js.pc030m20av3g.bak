import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  buildFilingSubmissionHistorySummary,
  loadFilingSubmissionHistory
} from "../src/features/fundamentals/filings/filingSubmissionHistoryService";

import {
  buildVerifiedFilingSummary,
  loadDuplicateVerifiedFilings,
  loadPendingVerifiedFilings,
  loadVerifiedFilings
} from "../src/features/fundamentals/filings/verifiedFilingDatasetManager";

import {
  loadFundamentalRecords,
  loadFundamentalRepositoryMetadata
} from "../src/features/fundamentals/fundamentalRepository";

import {
  initializeFundamentalRepository
} from "../src/features/fundamentals/fundamentalSeedLoader";

/*
 * ============================================================
 * PC-026A
 * FUNDAMENTAL DATA OPERATIONS CENTER
 * ============================================================
 *
 * Combines:
 *
 * - fundamental repository quality,
 * - research readiness,
 * - verified filing queues,
 * - duplicate and revision alerts,
 * - submission history,
 * - failed and blocked submissions,
 * - operational priorities,
 * - direct navigation to supporting workspaces.
 * ============================================================
 */

const OPERATION_ROUTES = [
  {
    id:
      "IMPORT",

    title:
      "Fundamental Import",

    description:
      "Import verified CSV, normalized JSON, or provider data.",

    route:
      "/fundamental-import"
  },
  {
    id:
      "EXTRACTION",

    title:
      "Single-Period Extraction",

    description:
      "Enter one annual filing and generate filing-ready JSON.",

    route:
      "/filing-extraction"
  },
  {
    id:
      "MULTI_PERIOD",

    title:
      "Multi-Period Extraction",

    description:
      "Compare several fiscal years and validate trends.",

    route:
      "/multi-period-filing-extraction"
  },
  {
    id:
      "BRIDGE",

    title:
      "Filing Import Bridge",

    description:
      "Preview and submit filing-ready JSON into the review workflow.",

    route:
      "/filing-import-bridge"
  },
  {
    id:
      "REVIEW",

    title:
      "Verified Filing Review",

    description:
      "Verify, approve, reject, revise, and promote filings.",

    route:
      "/verified-filings"
  },
  {
    id:
      "HISTORY",

    title:
      "Submission History",

    description:
      "Retry failed submissions and resolve duplicate blocks.",

    route:
      "/filing-submission-history"
  },
  {
    id:
      "RESEARCH",

    title:
      "Research & Valuation",

    description:
      "Review fair value, forecasts, research quality, and theses.",

    route:
      "/research-valuation"
  }
];

export default function FundamentalOperationsCenterScreen() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    records,
    setRecords
  ] = useState([]);

  const [
    repositoryMetadata,
    setRepositoryMetadata
  ] = useState(null);

  const [
    filings,
    setFilings
  ] = useState([]);

  const [
    filingSummary,
    setFilingSummary
  ] = useState(null);

  const [
    pendingFilings,
    setPendingFilings
  ] = useState([]);

  const [
    duplicateFilings,
    setDuplicateFilings
  ] = useState([]);

  const [
    submissionHistory,
    setSubmissionHistory
  ] = useState([]);

  const [
    submissionSummary,
    setSubmissionSummary
  ] = useState(null);

  const loadOperations =
    useCallback(
      async ({
        fullLoader = false
      } = {}) => {
        try {
          if (fullLoader) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          await initializeFundamentalRepository();

          const [
            repositoryRecords,
            metadata,
            allFilings,
            verifiedSummary,
            reviewQueue,
            duplicates,
            history,
            historySummary
          ] =
            await Promise.all([
              loadFundamentalRecords(),
              loadFundamentalRepositoryMetadata(),
              loadVerifiedFilings(),
              buildVerifiedFilingSummary(),
              loadPendingVerifiedFilings(),
              loadDuplicateVerifiedFilings(),
              loadFilingSubmissionHistory(),
              buildFilingSubmissionHistorySummary()
            ]);

          setRecords(
            safeArray(
              repositoryRecords
            )
          );

          setRepositoryMetadata(
            metadata
          );

          setFilings(
            safeArray(
              allFilings
            )
          );

          setFilingSummary(
            verifiedSummary
          );

          setPendingFilings(
            safeArray(
              reviewQueue
            )
          );

          setDuplicateFilings(
            safeArray(
              duplicates
            )
          );

          setSubmissionHistory(
            safeArray(
              history
            )
          );

          setSubmissionSummary(
            historySummary
          );
        } catch (
          loadError
        ) {
          console.error(
            "Unable to load fundamental operations center:",
            loadError
          );

          setError(
            loadError?.message ||
            "Unable to load fundamental operations data."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(
    () => {
      loadOperations({
        fullLoader:
          true
      });
    },
    [
      loadOperations
    ]
  );

  const repositoryAnalysis =
    useMemo(
      () => {
        const researchReady =
          records.filter(
            isResearchReady
          );

        const identityOnly =
          records.filter(
            (record) =>
              !isResearchReady(
                record
              )
          );

        const withWarnings =
          records.filter(
            hasWarnings
          );

        const qualityScores =
          records
            .map(
              (record) =>
                Number(
                  record
                    ?.dataQualityScore
                )
            )
            .filter(
              Number.isFinite
            );

        const averageQuality =
          qualityScores.length
            ? qualityScores.reduce(
                (
                  total,
                  value
                ) =>
                  total + value,
                0
              ) /
              qualityScores.length
            : 0;

        return {
          total:
            records.length,

          researchReady:
            researchReady.length,

          identityOnly:
            identityOnly.length,

          withWarnings:
            withWarnings.length,

          averageQuality:
            Math.round(
              averageQuality
            ),

          readinessPercentage:
            records.length
              ? Math.round(
                  (
                    researchReady.length /
                    records.length
                  ) *
                  100
                )
              : 0
        };
      },
      [
        records
      ]
    );

  const operationalPriorities =
    useMemo(
      () =>
        buildOperationalPriorities({
          repositoryAnalysis,
          filingSummary,
          pendingFilings,
          duplicateFilings,
          submissionSummary
        }),
      [
        duplicateFilings,
        filingSummary,
        pendingFilings,
        repositoryAnalysis,
        submissionSummary
      ]
    );

  const overallScore =
    useMemo(
      () =>
        calculateOperationsScore({
          repositoryAnalysis,
          filingSummary,
          submissionSummary
        }),
      [
        repositoryAnalysis,
        filingSummary,
        submissionSummary
      ]
    );

  const status =
    classifyOperationsStatus(
      overallScore,
      operationalPriorities
    );

  if (loading) {
    return (
      <View
        style={
          styles.center
        }
      >
        <ActivityIndicator
          size="large"
          color="#22d3ee"
        />

        <Text
          style={
            styles.muted
          }
        >
          Loading fundamental operations...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        PC-026A
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Fundamental Data Operations Center
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Monitor repository quality, filing review queues,
        duplicate alerts, extraction submissions, and research
        readiness from one operational dashboard.
      </Text>

      {error ? (
        <View
          style={
            styles.errorCard
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.hero
        }
      >
        <View
          style={
            styles.heroScore
          }
        >
          <Text
            style={
              styles.heroScoreValue
            }
          >
            {overallScore}
          </Text>

          <Text
            style={
              styles.heroScoreMaximum
            }
          >
            /100
          </Text>
        </View>

        <View
          style={
            styles.heroContent
          }
        >
          <Text
            style={
              styles.heroLabel
            }
          >
            Operations Health
          </Text>

          <Text
            style={
              styles.heroTitle
            }
          >
            {status.label}
          </Text>

          <Text
            style={
              status.actionRequired
                ? styles.heroAction
                : styles.heroHealthy
            }
          >
            {status.actionLevel}
          </Text>

          <Text
            style={
              styles.heroText
            }
          >
            {status.message}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.metricGrid
        }
      >
        <Metric
          label="Repository Records"
          value={
            repositoryAnalysis
              .total
          }
        />

        <Metric
          label="Research Ready"
          value={
            repositoryAnalysis
              .researchReady
          }
        />

        <Metric
          label="Awaiting Review"
          value={
            pendingFilings.length
          }
        />

        <Metric
          label="Approved Filings"
          value={
            filingSummary
              ?.approved ||
            0
          }
        />

        <Metric
          label="Duplicate Alerts"
          value={
            duplicateFilings.length
          }
        />

        <Metric
          label="Submission Failures"
          value={
            submissionSummary
              ?.failed ||
            0
          }
        />
      </View>

      <Section
        title="Repository Readiness"
        description="Quality and research coverage of the persistent fundamental-data repository."
      >
        <ProgressMetric
          label="Research Readiness"
          value={
            repositoryAnalysis
              .readinessPercentage
          }
        />

        <ProgressMetric
          label="Average Data Quality"
          value={
            repositoryAnalysis
              .averageQuality
          }
        />

        <View
          style={
            styles.summaryCard
          }
        >
          <Row
            label="Research-Ready Records"
            value={
              repositoryAnalysis
                .researchReady
            }
          />

          <Row
            label="Identity-Only Records"
            value={
              repositoryAnalysis
                .identityOnly
            }
          />

          <Row
            label="Records With Warnings"
            value={
              repositoryAnalysis
                .withWarnings
            }
          />

          <Row
            label="Seed Version"
            value={
              repositoryMetadata
                ?.seedVersion ||
              "Not seeded"
            }
          />

          <Row
            label="Schema Version"
            value={
              repositoryMetadata
                ?.schemaVersion ??
              "Not available"
            }
          />
        </View>

        <View
          style={
            styles.inlineActions
          }
        >
          <RouteButton
            label="Open Import Dashboard"
            route="/fundamental-import"
          />

          <RouteButton
            label="Open Research Dashboard"
            route="/research-valuation"
          />
        </View>
      </Section>

      <Section
        title="Filing Workflow"
        description="Current filing lifecycle, review workload, approval status, and revision controls."
      >
        <View
          style={
            styles.metricGrid
          }
        >
          <Metric
            label="Total Filings"
            value={
              filingSummary
                ?.total ||
              filings.length
            }
          />

          <Metric
            label="Draft"
            value={
              filingSummary
                ?.draft ||
              0
            }
          />

          <Metric
            label="Pending Review"
            value={
              filingSummary
                ?.pendingReview ||
              0
            }
          />

          <Metric
            label="Verified"
            value={
              filingSummary
                ?.verified ||
              0
            }
          />

          <Metric
            label="Rejected"
            value={
              filingSummary
                ?.rejected ||
              0
            }
          />

          <Metric
            label="Superseded"
            value={
              filingSummary
                ?.superseded ||
              0
            }
          />
        </View>

        {pendingFilings.length ? (
          pendingFilings
            .slice(
              0,
              5
            )
            .map(
              (filing) => (
                <AlertCard
                  key={
                    filing.id
                  }
                  title={`${filing.symbol} · ${formatLabel(
                    filing.status
                  )}`}
                  message={`${formatLabel(
                    filing.filingType
                  )} · FY ${
                    filing.fiscalYear ??
                    "N/A"
                  } · Revision ${
                    filing.revisionNumber ||
                    1
                  }`}
                  actionLabel="Open Filing"
                  onPress={() =>
                    router.push({
                      pathname:
                        "/verified-filings",

                      params: {
                        filingId:
                          filing.id
                      }
                    })
                  }
                />
              )
            )
        ) : (
          <EmptyState
            title="No Filing Review Queue"
            message="There are no pending or verified filings awaiting action."
          />
        )}
      </Section>

      <Section
        title="Submission Operations"
        description="Recent direct submissions, failures, retries, and duplicate blocks."
      >
        <View
          style={
            styles.metricGrid
          }
        >
          <Metric
            label="Submission Attempts"
            value={
              submissionSummary
                ?.total ||
              submissionHistory.length
            }
          />

          <Metric
            label="Submitted"
            value={
              submissionSummary
                ?.submitted ||
              0
            }
          />

          <Metric
            label="Failed"
            value={
              submissionSummary
                ?.failed ||
              0
            }
          />

          <Metric
            label="Invalid"
            value={
              submissionSummary
                ?.invalid ||
              0
            }
          />

          <Metric
            label="Duplicate Review"
            value={
              submissionSummary
                ?.duplicateReview ||
              0
            }
          />

          <Metric
            label="Retried"
            value={
              submissionSummary
                ?.retried ||
              0
            }
          />
        </View>

        {submissionHistory.length ? (
          submissionHistory
            .slice(
              0,
              5
            )
            .map(
              (entry) => (
                <AlertCard
                  key={
                    entry.id
                  }
                  title={`${entry.symbol || "Unknown"} · ${formatLabel(
                    entry.historyStatus
                  )}`}
                  message={`${formatLabel(
                    entry.sourceWorkspace
                  )} · ${formatLabel(
                    entry.submissionMode
                  )} · ${formatDateTime(
                    entry.updatedAt
                  )}`}
                  actionLabel={
                    entry.filingId
                      ? "Open Filing"
                      : "Open History"
                  }
                  onPress={() =>
                    entry.filingId
                      ? router.push({
                          pathname:
                            "/verified-filings",

                          params: {
                            filingId:
                              entry.filingId
                          }
                        })
                      : router.push(
                          "/filing-submission-history"
                        )
                  }
                />
              )
            )
        ) : (
          <EmptyState
            title="No Submission Activity"
            message="Direct filing submissions will appear here after PC-025D, PC-025E, or PC-025F is used."
          />
        )}
      </Section>

      <Section
        title="Duplicate and Revision Alerts"
        description="Filing duplicates and revisions requiring review or controlled resolution."
      >
        {duplicateFilings.length ? (
          duplicateFilings
            .slice(
              0,
              8
            )
            .map(
              (filing) => (
                <AlertCard
                  key={
                    filing.id
                  }
                  warning
                  title={`${filing.symbol} · ${formatLabel(
                    filing.duplicateStatus
                  )}`}
                  message={`FY ${
                    filing.fiscalYear ??
                    "N/A"
                  } · Revision ${
                    filing.revisionNumber ||
                    1
                  } · Status ${formatLabel(
                    filing.status
                  )}`}
                  actionLabel="Review Duplicate"
                  onPress={() =>
                    router.push({
                      pathname:
                        "/verified-filings",

                      params: {
                        filingId:
                          filing.id
                      }
                    })
                  }
                />
              )
            )
        ) : (
          <EmptyState
            title="No Duplicate Filing Alerts"
            message="No duplicate or revision warning is currently active."
          />
        )}
      </Section>

      <Section
        title="Operational Priorities"
        description="Highest-priority actions generated from repository, filing, and submission conditions."
      >
        {operationalPriorities.length ? (
          operationalPriorities.map(
            (priority) => (
              <PriorityCard
                key={
                  priority.id
                }
                priority={
                  priority
                }
              />
            )
          )
        ) : (
          <EmptyState
            title="No Immediate Priorities"
            message="The fundamental-data workflow currently has no urgent operational action."
          />
        )}
      </Section>

      <Section
        title="Operations Navigation"
        description="Open each specialized workspace in the fundamental-data pipeline."
      >
        <View
          style={
            styles.routeGrid
          }
        >
          {OPERATION_ROUTES.map(
            (item) => (
              <Pressable
                key={
                  item.id
                }
                style={
                  styles.routeCard
                }
                onPress={() =>
                  router.push(
                    item.route
                  )
                }
              >
                <Text
                  style={
                    styles.routeTitle
                  }
                >
                  {item.title}
                </Text>

                <Text
                  style={
                    styles.routeDescription
                  }
                >
                  {item.description}
                </Text>

                <Text
                  style={
                    styles.routeLink
                  }
                >
                  Open Workspace →
                </Text>
              </Pressable>
            )
          )}
        </View>
      </Section>

      <View
        style={
          styles.protectionCard
        }
      >
        <Text
          style={
            styles.protectionTitle
          }
        >
          Controlled Fundamental Operations
        </Text>

        <Text
          style={
            styles.protectionText
          }
        >
          This center monitors and routes the workflow. It does not
          automatically approve filings, resolve duplicates, fabricate
          missing data, or promote unapproved records.
        </Text>
      </View>

      <Pressable
        disabled={
          refreshing
        }
        style={[
          styles.refreshButton,

          refreshing &&
            styles.disabled
        ]}
        onPress={() =>
          loadOperations()
        }
      >
        {refreshing ? (
          <ActivityIndicator
            color="white"
          />
        ) : (
          <Text
            style={
              styles.buttonText
            }
          >
            Refresh Operations Center
          </Text>
        )}
      </Pressable>

      <Pressable
        style={
          styles.backButton
        }
        onPress={() =>
          router.replace("/fundamental-data-hub")
        }
      >
        <Text
          style={
            styles.backText
          }
        >
          Back
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function buildOperationalPriorities({
  repositoryAnalysis,
  filingSummary,
  pendingFilings,
  duplicateFilings,
  submissionSummary
}) {
  const priorities = [];

  if (
    repositoryAnalysis
      .researchReady ===
    0
  ) {
    priorities.push({
      id:
        "RESEARCH_READY_ZERO",

      level:
        "CRITICAL",

      title:
        "Populate Research-Ready Fundamentals",

      message:
        "No repository record currently contains sufficient financial evidence for research valuation.",

      route:
        "/fundamental-import",

      actionLabel:
        "Open Import Dashboard"
    });
  } else if (
    repositoryAnalysis
      .readinessPercentage <
    50
  ) {
    priorities.push({
      id:
        "LOW_RESEARCH_COVERAGE",

      level:
        "HIGH",

      title:
        "Increase Research Coverage",

      message:
        `Only ${repositoryAnalysis.readinessPercentage}% of repository records are research ready.`,

      route:
        "/fundamental-import",

      actionLabel:
        "Import Verified Data"
    });
  }

  if (
    pendingFilings.length >
    0
  ) {
    priorities.push({
      id:
        "PENDING_FILING_REVIEW",

      level:
        pendingFilings.length >=
        5
          ? "HIGH"
          : "MEDIUM",

      title:
        "Process Filing Review Queue",

      message:
        `${pendingFilings.length} filing(s) are awaiting verification or approval.`,

      route:
        "/verified-filings",

      actionLabel:
        "Open Review Queue"
    });
  }

  if (
    duplicateFilings.length >
    0
  ) {
    priorities.push({
      id:
        "DUPLICATE_FILINGS",

      level:
        "HIGH",

      title:
        "Resolve Duplicate Filings",

      message:
        `${duplicateFilings.length} duplicate or revision warning(s) require controlled review.`,

      route:
        "/verified-filings",

      actionLabel:
        "Review Duplicates"
    });
  }

  if (
    (
      submissionSummary
        ?.failed ||
      0
    ) >
    0
  ) {
    priorities.push({
      id:
        "FAILED_SUBMISSIONS",

      level:
        "HIGH",

      title:
        "Retry Failed Submissions",

      message:
        `${submissionSummary.failed} filing submission(s) failed and may require correction or retry.`,

      route:
        "/filing-submission-history",

      actionLabel:
        "Open Submission History"
    });
  }

  if (
    (
      submissionSummary
        ?.duplicateReview ||
      0
    ) >
    0
  ) {
    priorities.push({
      id:
        "BLOCKED_DUPLICATE_SUBMISSIONS",

      level:
        "HIGH",

      title:
        "Resolve Blocked Submissions",

      message:
        `${submissionSummary.duplicateReview} submission(s) are blocked for duplicate review.`,

      route:
        "/filing-submission-history",

      actionLabel:
        "Resolve Duplicate Blocks"
    });
  }

  if (
    repositoryAnalysis
      .withWarnings >
    0
  ) {
    priorities.push({
      id:
        "REPOSITORY_WARNINGS",

      level:
        "MEDIUM",

      title:
        "Review Data-Quality Warnings",

      message:
        `${repositoryAnalysis.withWarnings} repository record(s) contain data-quality or validation warnings.`,

      route:
        "/fundamental-import",

      actionLabel:
        "Review Repository"
    });
  }

  if (
    (
      filingSummary
        ?.rejected ||
      0
    ) >
    0
  ) {
    priorities.push({
      id:
        "REJECTED_FILINGS",

      level:
        "LOW",

      title:
        "Review Rejected Filing History",

      message:
        `${filingSummary.rejected} filing(s) were rejected and remain available for revision or audit.`,

      route:
        "/verified-filings",

      actionLabel:
        "Open Filing Register"
    });
  }

  const rank = {
    CRITICAL:
      4,

    HIGH:
      3,

    MEDIUM:
      2,

    LOW:
      1
  };

  return priorities.sort(
    (
      first,
      second
    ) =>
      rank[second.level] -
      rank[first.level]
  );
}

function calculateOperationsScore({
  repositoryAnalysis,
  filingSummary,
  submissionSummary
}) {
  const repositoryScore =
    repositoryAnalysis
      .readinessPercentage *
    0.45;

  const qualityScore =
    repositoryAnalysis
      .averageQuality *
    0.25;

  const filingPenalty =
    Math.min(
      (
        filingSummary
          ?.pendingReview ||
        0
      ) *
        4 +
      (
        filingSummary
          ?.duplicates ||
        0
      ) *
        6,
      25
    );

  const submissionPenalty =
    Math.min(
      (
        submissionSummary
          ?.failed ||
        0
      ) *
        6 +
      (
        submissionSummary
          ?.duplicateReview ||
        0
      ) *
        5,
      20
    );

  const base =
    repositoryScore +
    qualityScore +
    30;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        base -
        filingPenalty -
        submissionPenalty
      )
    )
  );
}

function classifyOperationsStatus(
  score,
  priorities
) {
  const critical =
    priorities.some(
      (priority) =>
        priority.level ===
        "CRITICAL"
    );

  const high =
    priorities.filter(
      (priority) =>
        priority.level ===
        "HIGH"
    ).length;

  if (
    critical ||
    score <
    35
  ) {
    return {
      label:
        "Critical Review",

      actionLevel:
        "Immediate Action",

      actionRequired:
        true,

      message:
        "Fundamental-data coverage or workflow controls require immediate attention."
    };
  }

  if (
    high >=
      2 ||
    score <
      60
  ) {
    return {
      label:
        "Needs Attention",

      actionLevel:
        "Priority Review",

      actionRequired:
        true,

      message:
        "Several operational issues should be resolved before expanding research coverage."
    };
  }

  if (
    score <
    80
  ) {
    return {
      label:
        "Operational",

      actionLevel:
        "Monitor",

      actionRequired:
        false,

      message:
        "The workflow is operational, with manageable quality or review tasks remaining."
    };
  }

  return {
    label:
      "Strong",

    actionLevel:
      "Normal Operations",

    actionRequired:
      false,

    message:
      "Fundamental-data quality and workflow controls are operating at a strong level."
  };
}

function isResearchReady(
  record
) {
  return Boolean(
    record
      ?.earningsPerShare !==
      null &&
    record
      ?.earningsPerShare !==
      undefined ||
    record
      ?.bookValuePerShare !==
      null &&
    record
      ?.bookValuePerShare !==
      undefined ||
    record
      ?.freeCashFlowPerShare !==
      null &&
    record
      ?.freeCashFlowPerShare !==
      undefined ||
    record
      ?.revenue !==
      null &&
    record
      ?.revenue !==
      undefined
  );
}

function hasWarnings(
  record
) {
  return (
    safeArray(
      record
        ?.dataQuality
        ?.warnings
    ).length >
      0 ||
    safeArray(
      record
        ?.validation
        ?.warnings
    ).length >
      0 ||
    safeArray(
      record?.warnings
    ).length >
      0
  );
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function formatLabel(value) {
  return String(
    value ||
    ""
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? "Not available"
    : date.toLocaleString();
}

function Section({
  title,
  description,
  children
}) {
  return (
    <View
      style={
        styles.section
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.sectionDescription
        }
      >
        {description}
      </Text>

      {children}
    </View>
  );
}

function Metric({
  label,
  value
}) {
  return (
    <View
      style={
        styles.metricCard
      }
    >
      <Text
        style={
          styles.metricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.metricValue
        }
      >
        {String(value)}
      </Text>
    </View>
  );
}

function ProgressMetric({
  label,
  value
}) {
  const normalized =
    Math.max(
      0,
      Math.min(
        100,
        Number(value) ||
        0
      )
    );

  return (
    <View
      style={
        styles.progressCard
      }
    >
      <View
        style={
          styles.progressHeader
        }
      >
        <Text
          style={
            styles.progressLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.progressValue
          }
        >
          {Math.round(
            normalized
          )}
          /100
        </Text>
      </View>

      <View
        style={
          styles.progressTrack
        }
      >
        <View
          style={[
            styles.progressFill,

            {
              width:
                `${normalized}%`
            }
          ]}
        />
      </View>
    </View>
  );
}

function Row({
  label,
  value
}) {
  return (
    <View
      style={
        styles.row
      }
    >
      <Text
        style={
          styles.rowLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.rowValue
        }
      >
        {String(value)}
      </Text>
    </View>
  );
}

function AlertCard({
  title,
  message,
  actionLabel,
  onPress,
  warning = false
}) {
  return (
    <View
      style={[
        styles.alertCard,

        warning &&
          styles.alertWarning
      ]}
    >
      <Text
        style={
          warning
            ? styles.alertWarningTitle
            : styles.alertTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.alertText
        }
      >
        {message}
      </Text>

      <Pressable
        style={
          styles.alertButton
        }
        onPress={
          onPress
        }
      >
        <Text
          style={
            styles.alertButtonText
          }
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function PriorityCard({
  priority
}) {
  return (
    <View
      style={[
        styles.priorityCard,

        priority.level ===
          "CRITICAL" &&
          styles.priorityCritical,

        priority.level ===
          "HIGH" &&
          styles.priorityHigh
      ]}
    >
      <View
        style={
          styles.priorityHeader
        }
      >
        <Text
          style={
            styles.priorityTitle
          }
        >
          {priority.title}
        </Text>

        <Text
          style={
            priority.level ===
              "CRITICAL"
              ? styles.criticalText
              : priority.level ===
                  "HIGH"
                ? styles.highText
                : styles.mediumText
          }
        >
          {priority.level}
        </Text>
      </View>

      <Text
        style={
          styles.priorityMessage
        }
      >
        {priority.message}
      </Text>

      <Pressable
        style={
          styles.priorityButton
        }
        onPress={() =>
          router.push(
            priority.route
          )
        }
      >
        <Text
          style={
            styles.priorityButtonText
          }
        >
          {priority.actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function RouteButton({
  label,
  route
}) {
  return (
    <Pressable
      style={
        styles.routeButton
      }
      onPress={() =>
        router.push(
          route
        )
      }
    >
      <Text
        style={
          styles.routeButtonText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({
  title,
  message
}) {
  return (
    <View
      style={
        styles.emptyCard
      }
    >
      <Text
        style={
          styles.alertTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.alertText
        }
      >
        {message}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex:
        1,

      backgroundColor:
        "#020617"
    },

    content: {
      padding:
        22,

      paddingTop:
        70,

      paddingBottom:
        110
    },

    center: {
      flex:
        1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#020617"
    },

    muted: {
      color:
        "#94a3b8",

      marginTop:
        12
    },

    eyebrow: {
      color:
        "#22d3ee",

      fontWeight:
        "900"
    },

    title: {
      color:
        "white",

      fontSize:
        31,

      fontWeight:
        "900",

      marginTop:
        8
    },

    subtitle: {
      color:
        "#94a3b8",

      lineHeight:
        22,

      marginTop:
        10
    },

    hero: {
      backgroundColor:
        "rgba(34,211,238,.08)",

      borderColor:
        "rgba(34,211,238,.35)",

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        18,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        17,

      marginTop:
        20
    },

    heroScore: {
      width:
        96,

      height:
        96,

      borderRadius:
        48,

      borderWidth:
        6,

      borderColor:
        "#22d3ee",

      alignItems:
        "center",

      justifyContent:
        "center"
    },

    heroScoreValue: {
      color:
        "#86efac",

      fontSize:
        29,

      fontWeight:
        "900"
    },

    heroScoreMaximum: {
      color:
        "#94a3b8",

      fontSize:
        11,

      fontWeight:
        "900"
    },

    heroContent: {
      flex:
        1
    },

    heroLabel: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    heroTitle: {
      color:
        "white",

      fontSize:
        22,

      fontWeight:
        "900",

      marginTop:
        5
    },

    heroAction: {
      color:
        "#fca5a5",

      fontWeight:
        "900",

      marginTop:
        5
    },

    heroHealthy: {
      color:
        "#86efac",

      fontWeight:
        "900",

      marginTop:
        5
    },

    heroText: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        7
    },

    metricGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        14
    },

    metricCard: {
      width:
        "47%",

      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        13
    },

    metricLabel: {
      color:
        "#94a3b8",

      fontSize:
        11
    },

    metricValue: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        6
    },

    section: {
      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        17,

      marginTop:
        20
    },

    sectionTitle: {
      color:
        "#67e8f9",

      fontSize:
        19,

      fontWeight:
        "900"
    },

    sectionDescription: {
      color:
        "#94a3b8",

      lineHeight:
        20,

      marginTop:
        7,

      marginBottom:
        5
    },

    progressCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        12
    },

    progressHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between"
    },

    progressLabel: {
      color:
        "#cbd5e1",

      fontWeight:
        "900"
    },

    progressValue: {
      color:
        "white",

      fontWeight:
        "900"
    },

    progressTrack: {
      height:
        8,

      borderRadius:
        4,

      backgroundColor:
        "#1e293b",

      marginTop:
        10,

      overflow:
        "hidden"
    },

    progressFill: {
      height:
        "100%",

      backgroundColor:
        "#22c55e",

      borderRadius:
        4
    },

    summaryCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        12
    },

    row: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        12,

      marginTop:
        10
    },

    rowLabel: {
      color:
        "#94a3b8",

      flex:
        1
    },

    rowValue: {
      color:
        "white",

      fontWeight:
        "900",

      textAlign:
        "right",

      flex:
        1
    },

    inlineActions: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        9,

      marginTop:
        13
    },

    routeButton: {
      backgroundColor:
        "#155e75",

      borderRadius:
        12,

      padding:
        12
    },

    routeButtonText: {
      color:
        "white",

      fontWeight:
        "900"
    },

    alertCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        11
    },

    alertWarning: {
      borderColor:
        "rgba(245,158,11,.50)"
    },

    alertTitle: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    alertWarningTitle: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    alertText: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        7
    },

    alertButton: {
      backgroundColor:
        "#334155",

      borderRadius:
        11,

      padding:
        11,

      marginTop:
        12
    },

    alertButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    priorityCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        11
    },

    priorityCritical: {
      borderColor:
        "rgba(239,68,68,.60)"
    },

    priorityHigh: {
      borderColor:
        "rgba(245,158,11,.55)"
    },

    priorityHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        12
    },

    priorityTitle: {
      color:
        "white",

      fontWeight:
        "900",

      flex:
        1
    },

    criticalText: {
      color:
        "#fca5a5",

      fontWeight:
        "900"
    },

    highText: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    mediumText: {
      color:
        "#93c5fd",

      fontWeight:
        "900"
    },

    priorityMessage: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        8
    },

    priorityButton: {
      backgroundColor:
        "#7c3aed",

      borderRadius:
        11,

      padding:
        11,

      marginTop:
        12
    },

    priorityButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    routeGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        12
    },

    routeCard: {
      width:
        "47%",

      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14
    },

    routeTitle: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    routeDescription: {
      color:
        "#94a3b8",

      lineHeight:
        19,

      marginTop:
        7
    },

    routeLink: {
      color:
        "#c084fc",

      fontWeight:
        "900",

      marginTop:
        11
    },

    emptyCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        11
    },

    protectionCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderColor:
        "rgba(245,158,11,.35)",

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        17,

      marginTop:
        20
    },

    protectionTitle: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    protectionText: {
      color:
        "#fef3c7",

      lineHeight:
        21,

      marginTop:
        7
    },

    refreshButton: {
      backgroundColor:
        "#0891b2",

      borderRadius:
        16,

      padding:
        16,

      marginTop:
        18
    },

    buttonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    backButton: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        16,

      padding:
        16,

      marginTop:
        12
    },

    backText: {
      color:
        "#67e8f9",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",

      borderColor:
        "rgba(239,68,68,.35)",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        13,

      marginTop:
        15
    },

    errorText: {
      color:
        "#fca5a5"
    },

    disabled: {
      opacity:
        0.5
    }
  });
