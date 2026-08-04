import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  FILING_DUPLICATE_RESOLUTIONS,
  FILING_SUBMISSION_HISTORY_STATUSES,
  archiveFilingSubmissionHistoryEntry,
  buildFilingSubmissionHistorySummary,
  loadFilingSubmissionHistory,
  resolveDuplicateSubmission,
  retryFilingSubmission
} from "../src/features/fundamentals/filings/filingSubmissionHistoryService";

/*
 * ============================================================
 * PC-025H
 * FILING WORKFLOW STATUS AND SUBMISSION HISTORY
 * ============================================================
 */

const FILTERS = [
  "ALL",
  FILING_SUBMISSION_HISTORY_STATUSES
    .SUBMITTED,
  FILING_SUBMISSION_HISTORY_STATUSES
    .FAILED,
  FILING_SUBMISSION_HISTORY_STATUSES
    .INVALID,
  FILING_SUBMISSION_HISTORY_STATUSES
    .DUPLICATE_REVIEW_REQUIRED,
  FILING_SUBMISSION_HISTORY_STATUSES
    .RETRYING,
  FILING_SUBMISSION_HISTORY_STATUSES
    .RESOLVED
];

export default function FilingSubmissionHistoryScreen() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    workingId,
    setWorkingId
  ] = useState(null);

  const [
    records,
    setRecords
  ] = useState([]);

  const [
    summary,
    setSummary
  ] = useState(null);

  const [
    filter,
    setFilter
  ] = useState("ALL");

  const [
    selectedId,
    setSelectedId
  ] = useState(null);

  const [
    resolutionNote,
    setResolutionNote
  ] = useState("");

  const [
    existingFilingId,
    setExistingFilingId
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  const loadData =
    useCallback(
      async () => {
        try {
          setError("");

          const [
            history,
            historySummary
          ] =
            await Promise.all([
              loadFilingSubmissionHistory(),
              buildFilingSubmissionHistorySummary()
            ]);

          setRecords(
            history
          );

          setSummary(
            historySummary
          );

          setSelectedId(
            (current) =>
              current ||
              history?.[0]?.id ||
              null
          );
        } catch (
          loadError
        ) {
          setError(
            loadError?.message ||
            "Unable to load filing submission history."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(
    () => {
      loadData();
    },
    [
      loadData
    ]
  );

  const visible =
    useMemo(
      () =>
        filter ===
        "ALL"
          ? records
          : records.filter(
              (entry) =>
                entry
                  ?.historyStatus ===
                filter
            ),
      [
        filter,
        records
      ]
    );

  const selected =
    useMemo(
      () =>
        records.find(
          (entry) =>
            entry?.id ===
            selectedId
        ) ||
        records[0] ||
        null,
      [
        records,
        selectedId
      ]
    );

  async function runRetry(
    entry,
    allowDuplicate =
      null
  ) {
    try {
      setWorkingId(
        entry.id
      );

      const result =
        await retryFilingSubmission({
          historyId:
            entry.id,

          actor: {
            id:
              "gatecep-history-user",

            name:
              "Gatecep History User"
          },

          allowDuplicate
        });

      await loadData();

      Alert.alert(
        "Retry Complete",
        result?.submitted
          ? "The filing was submitted successfully."
          : `Retry status: ${result?.status || "Unknown"}.`
      );
    } catch (
      retryError
    ) {
      setError(
        retryError?.message ||
        "Unable to retry the submission."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function resolveDuplicate(
    resolution
  ) {
    if (!selected) {
      return;
    }

    try {
      setWorkingId(
        selected.id
      );

      await resolveDuplicateSubmission({
        historyId:
          selected.id,

        resolution,

        actor: {
          id:
            "gatecep-history-user",

          name:
            "Gatecep History User"
        },

        note:
          resolutionNote,

        existingFilingId:
          existingFilingId ||
          null
      });

      setResolutionNote("");
      setExistingFilingId("");

      await loadData();
    } catch (
      resolutionError
    ) {
      setError(
        resolutionError?.message ||
        "Unable to resolve the duplicate submission."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function archiveEntry(
    entry
  ) {
    try {
      setWorkingId(
        entry.id
      );

      await archiveFilingSubmissionHistoryEntry(
        entry.id
      );

      await loadData();
    } finally {
      setWorkingId(null);
    }
  }

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
          Loading submission history...
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
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        PC-025H
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Filing Submission History
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Review submission receipts, retry failures, resolve
        duplicate blocks, and open linked verified filings.
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
          styles.metrics
        }
      >
        <Metric
          label="Total"
          value={
            summary?.total ||
            0
          }
        />

        <Metric
          label="Submitted"
          value={
            summary?.submitted ||
            0
          }
        />

        <Metric
          label="Failed"
          value={
            summary?.failed ||
            0
          }
        />

        <Metric
          label="Duplicate Review"
          value={
            summary
              ?.duplicateReview ||
            0
          }
        />

        <Metric
          label="Retried"
          value={
            summary?.retried ||
            0
          }
        />

        <Metric
          label="Linked Filings"
          value={
            summary
              ?.linkedFilings ||
            0
          }
        />
      </View>

      <Section
        title="Submission Register"
        description="Filter and select a submission attempt."
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filters
          }
        >
          {FILTERS.map(
            (value) => (
              <Pressable
                key={
                  value
                }
                style={[
                  styles.filterButton,

                  filter ===
                    value &&
                    styles.filterActive
                ]}
                onPress={() =>
                  setFilter(
                    value
                  )
                }
              >
                <Text
                  style={
                    styles.filterText
                  }
                >
                  {formatLabel(
                    value
                  )}
                </Text>
              </Pressable>
            )
          )}
        </ScrollView>

        {visible.length ? (
          visible.map(
            (entry) => (
              <Pressable
                key={
                  entry.id
                }
                style={[
                  styles.historyCard,

                  selected?.id ===
                    entry.id &&
                    styles.historySelected
                ]}
                onPress={() =>
                  setSelectedId(
                    entry.id
                  )
                }
              >
                <View
                  style={
                    styles.headerRow
                  }
                >
                  <View
                    style={{
                      flex:
                        1
                    }}
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {
                        entry.symbol ||
                        "Unknown"
                      }
                    </Text>

                    <Text
                      style={
                        styles.muted
                      }
                    >
                      {
                        entry.companyName ||
                        entry.sourceWorkspace
                      }
                    </Text>
                  </View>

                  <Text
                    style={
                      statusStyle(
                        entry.historyStatus
                      )
                    }
                  >
                    {formatLabel(
                      entry.historyStatus
                    )}
                  </Text>
                </View>

                <Row
                  label="Submitted"
                  value={
                    formatDateTime(
                      entry.submittedAt
                    )
                  }
                />

                <Row
                  label="Mode"
                  value={
                    formatLabel(
                      entry.submissionMode
                    )
                  }
                />

                <Row
                  label="Retries"
                  value={
                    entry.retryCount
                  }
                />
              </Pressable>
            )
          )
        ) : (
          <Text
            style={
              styles.muted
            }
          >
            No submission matches this filter.
          </Text>
        )}
      </Section>

      {selected ? (
        <Section
          title="Submission Detail"
          description="Receipt, duplicate status, errors, retry, and filing navigation."
        >
          <Row
            label="History ID"
            value={
              selected.id
            }
          />

          <Row
            label="Receipt ID"
            value={
              selected.receiptId ||
              "Not available"
            }
          />

          <Row
            label="Filing ID"
            value={
              selected.filingId ||
              "Not created"
            }
          />

          <Row
            label="Bridge Status"
            value={
              formatLabel(
                selected.bridgeStatus
              )
            }
          />

          <Row
            label="Filing Status"
            value={
              formatLabel(
                selected.filingStatus
              )
            }
          />

          <Row
            label="Duplicate Status"
            value={
              formatLabel(
                selected.duplicateStatus
              )
            }
          />

          <Row
            label="Duplicate Resolution"
            value={
              formatLabel(
                selected
                  .duplicateResolution
              )
            }
          />

          {selected.error ? (
            <View
              style={
                styles.errorDetail
              }
            >
              <Text
                style={
                  styles.errorText
                }
              >
                {selected.error}
              </Text>
            </View>
          ) : null}

          <View
            style={
              styles.actions
            }
          >
            <Action
              label={
                workingId ===
                selected.id
                  ? "Working..."
                  : "Retry Submission"
              }
              disabled={
                workingId ===
                selected.id ||
                !selected.payload
              }
              onPress={() =>
                runRetry(
                  selected
                )
              }
            />

            {selected.filingId ? (
              <Action
                label="Open Filing"
                positive
                onPress={() =>
                  router.push({
                    pathname:
                      "/verified-filings",

                    params: {
                      filingId:
                        selected.filingId
                    }
                  })
                }
              />
            ) : null}

            <Action
              label="Archive"
              danger
              disabled={
                workingId ===
                selected.id
              }
              onPress={() =>
                archiveEntry(
                  selected
                )
              }
            />
          </View>

          {selected
            .historyStatus ===
          FILING_SUBMISSION_HISTORY_STATUSES
            .DUPLICATE_REVIEW_REQUIRED ? (
            <View
              style={
                styles.duplicatePanel
              }
            >
              <Text
                style={
                  styles.panelTitle
                }
              >
                Duplicate Resolution
              </Text>

              <TextInput
                style={
                  styles.input
                }
                placeholder="Existing filing ID, when linking"
                placeholderTextColor="#64748b"
                value={
                  existingFilingId
                }
                onChangeText={
                  setExistingFilingId
                }
              />

              <TextInput
                style={
                  styles.textArea
                }
                multiline
                placeholder="Resolution note"
                placeholderTextColor="#64748b"
                value={
                  resolutionNote
                }
                onChangeText={
                  setResolutionNote
                }
              />

              <View
                style={
                  styles.actions
                }
              >
                <Action
                  label="Override and Submit"
                  positive
                  onPress={() =>
                    resolveDuplicate(
                      FILING_DUPLICATE_RESOLUTIONS
                        .OVERRIDE_AND_SUBMIT
                    )
                  }
                />

                <Action
                  label="Link Existing"
                  onPress={() =>
                    resolveDuplicate(
                      FILING_DUPLICATE_RESOLUTIONS
                        .LINK_EXISTING
                    )
                  }
                />

                <Action
                  label="Cancel Submission"
                  danger
                  onPress={() =>
                    resolveDuplicate(
                      FILING_DUPLICATE_RESOLUTIONS
                        .CANCELLED
                    )
                  }
                />
              </View>
            </View>
          ) : null}

          <Text
            style={
              styles.panelTitle
            }
          >
            History Events
          </Text>

          {selected.events?.map(
            (
              event,
              index
            ) => (
              <View
                key={
                  `${event?.action}-${index}`
                }
                style={
                  styles.eventCard
                }
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  {formatLabel(
                    event?.action
                  )}
                </Text>

                <Text
                  style={
                    styles.muted
                  }
                >
                  {formatDateTime(
                    event?.timestamp
                  )}
                </Text>
              </View>
            )
          )}
        </Section>
      ) : null}

      <Pressable
        style={
          styles.refresh
        }
        onPress={
          loadData
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          Refresh History
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.back
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
          styles.subtitle
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
        styles.metric
      }
    >
      <Text
        style={
          styles.muted
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
          styles.muted
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

function Action({
  label,
  onPress,
  disabled,
  positive = false,
  danger = false
}) {
  return (
    <Pressable
      disabled={
        disabled
      }
      style={[
        styles.action,

        positive &&
          styles.actionPositive,

        danger &&
          styles.actionDanger,

        disabled &&
          styles.disabled
      ]}
      onPress={
        onPress
      }
    >
      <Text
        style={
          styles.buttonText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
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

function statusStyle(status) {
  if (
    status ===
    FILING_SUBMISSION_HISTORY_STATUSES
      .SUBMITTED
  ) {
    return styles.successText;
  }

  if (
    status ===
      FILING_SUBMISSION_HISTORY_STATUSES
        .FAILED ||
    status ===
      FILING_SUBMISSION_HISTORY_STATUSES
        .INVALID
  ) {
    return styles.errorText;
  }

  return styles.warningText;
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

      backgroundColor:
        "#020617",

      alignItems:
        "center",

      justifyContent:
        "center"
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
        21,

      marginTop:
        7
    },

    muted: {
      color:
        "#94a3b8"
    },

    metrics: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        18
    },

    metric: {
      width:
        "47%",

      backgroundColor:
        "#0f172a",

      borderRadius:
        14,

      padding:
        14
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

    filters: {
      gap:
        8,

      paddingVertical:
        12
    },

    filterButton: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        11,

      padding:
        11
    },

    filterActive: {
      backgroundColor:
        "#0891b2"
    },

    filterText: {
      color:
        "white",

      fontWeight:
        "900"
    },

    historyCard: {
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
        10
    },

    historySelected: {
      borderColor:
        "#22d3ee",

      borderWidth:
        2
    },

    headerRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        12
    },

    cardTitle: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
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

    successText: {
      color:
        "#86efac",

      fontWeight:
        "900"
    },

    warningText: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    errorText: {
      color:
        "#fca5a5",

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

    errorDetail: {
      backgroundColor:
        "#020617",

      borderColor:
        "rgba(239,68,68,.45)",

      borderWidth:
        1,

      borderRadius:
        12,

      padding:
        12,

      marginTop:
        12
    },

    actions: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        9,

      marginTop:
        14
    },

    action: {
      backgroundColor:
        "#334155",

      borderRadius:
        12,

      padding:
        13
    },

    actionPositive: {
      backgroundColor:
        "#15803d"
    },

    actionDanger: {
      backgroundColor:
        "#b91c1c"
    },

    disabled: {
      opacity:
        0.45
    },

    buttonText: {
      color:
        "white",

      fontWeight:
        "900",

      textAlign:
        "center"
    },

    duplicatePanel: {
      backgroundColor:
        "rgba(245,158,11,.08)",

      borderColor:
        "rgba(245,158,11,.40)",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        15
    },

    panelTitle: {
      color:
        "#c084fc",

      fontWeight:
        "900",

      fontSize:
        16,

      marginTop:
        16
    },

    input: {
      backgroundColor:
        "#020617",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        12,

      padding:
        12,

      color:
        "white",

      marginTop:
        10
    },

    textArea: {
      minHeight:
        80,

      backgroundColor:
        "#020617",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        12,

      padding:
        12,

      color:
        "white",

      marginTop:
        10
    },

    eventCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        12,

      padding:
        12,

      marginTop:
        9
    },

    refresh: {
      backgroundColor:
        "#0891b2",

      borderRadius:
        15,

      padding:
        16,

      marginTop:
        18
    },

    back: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        15,

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
    }
  });
