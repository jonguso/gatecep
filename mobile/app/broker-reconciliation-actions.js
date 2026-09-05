import React, {
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
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  approveBrokerReconciliationAction,
  cancelBrokerReconciliationAction,
  completeBrokerReconciliationAction,
  loadBrokerReconciliationActions,
  startBrokerReconciliationAction
} from "../src/features/broker-sync/brokerReconciliationActionStore";

const FILTERS = [
  {
    value: "ALL",
    label: "All"
  },
  {
    value: "PLANNED",
    label: "Planned"
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress"
  },
  {
    value: "APPROVED",
    label: "Approved"
  },
  {
    value: "COMPLETED",
    label: "Completed"
  },
  {
    value: "CANCELLED",
    label: "Cancelled"
  }
];

export default function BrokerReconciliationActions() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    processingId,
    setProcessingId
  ] = useState(null);

  const [
    actions,
    setActions
  ] = useState([]);

  const [
    filter,
    setFilter
  ] = useState("ALL");

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadActions();
  }, []);

  async function loadActions() {
    try {
      setLoading(true);
      setError("");

      const result =
        await loadBrokerReconciliationActions();

      const safeActions =
        Array.isArray(result)
          ? result
          : [];

      const sorted =
        [...safeActions].sort(
          (a, b) =>
            new Date(
              b?.createdAt ||
              b?.updatedAt ||
              0
            ).getTime() -
            new Date(
              a?.createdAt ||
              a?.updatedAt ||
              0
            ).getTime()
        );

      setActions(sorted);
    } catch (err) {
      console.error(
        "Unable to load reconciliation actions:",
        err
      );

      setError(
        err?.message ||
          "Unable to load reconciliation actions."
      );

      setActions([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateAction({
    action,
    operation
  }) {
    if (!action?.id) {
      return;
    }

    try {
      setProcessingId(
        action.id
      );

      setError("");

      let updated = null;

      switch (operation) {
        case "START":
          updated =
            await startBrokerReconciliationAction(
              action.id
            );
          break;

        case "APPROVE":
          updated =
            await approveBrokerReconciliationAction(
              action.id,
              "CURRENT_USER"
            );
          break;

        case "COMPLETE":
          updated =
            await completeBrokerReconciliationAction(
              action.id,
              "Action completed through the PC-013 Action Center."
            );
          break;

        case "CANCEL":
          updated =
            await cancelBrokerReconciliationAction(
              action.id,
              "Action cancelled through the PC-013 Action Center."
            );
          break;

        default:
          return;
      }

      if (!updated) {
        throw new Error(
          "The action could not be updated."
        );
      }

      setActions(
        (current) =>
          current.map(
            (item) =>
              item.id === updated.id
                ? updated
                : item
          )
      );
    } catch (err) {
      console.error(
        "Unable to update reconciliation action:",
        err
      );

      Alert.alert(
        "PC-013 Action Center",
        err?.message ||
          "Unable to update this reconciliation action."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function confirmComplete(
    action
  ) {
    Alert.alert(
      "Complete Action",
      "Mark this workflow action as completed? This does not change holdings, cash, or broker records.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Complete",
          onPress: () =>
            updateAction({
              action,
              operation:
                "COMPLETE"
            })
        }
      ]
    );
  }

  function confirmCancel(
    action
  ) {
    Alert.alert(
      "Cancel Action",
      "Cancel this workflow action? The reconciliation history will remain available.",
      [
        {
          text: "Keep Action",
          style: "cancel"
        },
        {
          text: "Cancel Action",
          style: "destructive",
          onPress: () =>
            updateAction({
              action,
              operation:
                "CANCEL"
            })
        }
      ]
    );
  }

  const visibleActions =
    useMemo(() => {
      if (
        filter === "ALL"
      ) {
        return actions;
      }

      return actions.filter(
        (item) =>
          item?.status ===
          filter
      );
    }, [
      actions,
      filter
    ]);

  const summary =
    useMemo(() => {
      return {
        total:
          actions.length,

        planned:
          actions.filter(
            (item) =>
              item?.status ===
              "PLANNED"
          ).length,

        inProgress:
          actions.filter(
            (item) =>
              item?.status ===
              "IN_PROGRESS"
          ).length,

        approved:
          actions.filter(
            (item) =>
              item?.status ===
              "APPROVED"
          ).length,

        completed:
          actions.filter(
            (item) =>
              item?.status ===
              "COMPLETED"
          ).length,

        cancelled:
          actions.filter(
            (item) =>
              item?.status ===
              "CANCELLED"
          ).length
      };
    }, [actions]);

  if (loading) {
    return (
      <View
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text
          style={styles.loadingText}
        >
          Loading reconciliation actions...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
    >
      <Text
        style={styles.eyebrow}
      >
        PC-013
      </Text>

      <Text
        style={styles.title}
      >
        Practice Reconciliation Actions
      </Text>

      <Text
        style={styles.subtitle}
      >
        PRACTICE ONLY — manage sandbox follow-up notes. These actions never enter the REAL investor record.
      </Text>

      {error ? (
        <View
          style={styles.errorCard}
        >
          <Text
            style={styles.errorText}
          >
            {error}
          </Text>
        </View>
      ) : null}

      <View
        style={styles.coachCard}
      >
        <Text
          style={styles.coachLabel}
        >
          COACH G
        </Text>

        <Text
          style={styles.coachText}
        >
          These actions document what should
          happen after a discrepancy is
          explained. Completing an action does
          not place a trade, move cash, or
          modify a broker account.
        </Text>
      </View>

      <View
        style={styles.metricGrid}
      >
        <Metric
          label="Total"
          value={summary.total}
        />

        <Metric
          label="Planned"
          value={summary.planned}
        />

        <Metric
          label="In Progress"
          value={summary.inProgress}
        />

        <Metric
          label="Approved"
          value={summary.approved}
        />

        <Metric
          label="Completed"
          value={summary.completed}
        />

        <Metric
          label="Cancelled"
          value={summary.cancelled}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filterRow
        }
      >
        {FILTERS.map(
          (item) => (
            <Pressable
              key={item.value}
              style={[
                styles.filterButton,
                filter ===
                  item.value &&
                  styles.filterButtonActive
              ]}
              onPress={() =>
                setFilter(
                  item.value
                )
              }
            >
              <Text
                style={[
                  styles.filterText,
                  filter ===
                    item.value &&
                    styles.filterTextActive
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        )}
      </ScrollView>

      {visibleActions.length ? (
        visibleActions.map(
          (action) => (
            <ActionCard
              key={action.id}
              action={action}
              processing={
                processingId ===
                action.id
              }
              onStart={() =>
                updateAction({
                  action,
                  operation:
                    "START"
                })
              }
              onApprove={() =>
                updateAction({
                  action,
                  operation:
                    "APPROVE"
                })
              }
              onComplete={() =>
                confirmComplete(
                  action
                )
              }
              onCancel={() =>
                confirmCancel(
                  action
                )
              }
            />
          )
        )
      ) : (
        <View
          style={styles.emptyCard}
        >
          <Text
            style={styles.emptyTitle}
          >
            No Actions Found
          </Text>

          <Text
            style={styles.emptyText}
          >
            No reconciliation actions exist
            in this category.
          </Text>

          <Text
            style={styles.emptyHint}
          >
            A PC-013 action is created when a
            discrepancy is resolved after the
            Action Engine has been enabled.
          </Text>
        </View>
      )}

      <View
        style={styles.protectionCard}
      >
        <Text
          style={styles.protectionTitle}
        >
          Workflow Only
        </Text>

        <Text
          style={styles.protectionText}
        >
          Starting, approving, completing, or
          cancelling an action changes only
          its operational workflow status.
          It does not execute the recommended
          activity.
        </Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={loadActions}
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Refresh Action Center
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-reconciliation-cases"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Case Registry
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-resolution"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Reconciliation Resolution
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-resolution-ledger"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Resolution Ledger
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.replace(
            "/(tabs)/dashboard"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Back to Dashboard
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function ActionCard({
  action,
  processing,
  onStart,
  onApprove,
  onComplete,
  onCancel
}) {
  const status =
    action?.status ||
    "PLANNED";

  const approvalRequired =
    Boolean(
      action?.requiresApproval
    );

  const approved =
    Boolean(
      action?.approved
    ) ||
    status === "APPROVED" ||
    status === "IN_PROGRESS" ||
    status === "COMPLETED";

  const terminal =
    status === "COMPLETED" ||
    status === "CANCELLED";

  return (
    <View
      style={[
        styles.actionCard,
        status ===
          "COMPLETED" &&
          styles.completedCard,

        status ===
          "CANCELLED" &&
          styles.cancelledCard
      ]}
    >
      <View
        style={styles.actionHeader}
      >
        <View
          style={{ flex: 1 }}
        >
          <Text
            style={styles.actionTitle}
          >
            {action?.actionLabel ||
              action?.actionCode ||
              "Reconciliation Action"}
          </Text>

          <Text
            style={styles.actionCode}
          >
            {action?.actionCode ||
              "UNKNOWN_ACTION"}
          </Text>
        </View>

        <Text
          style={[
            styles.status,
            actionStatusStyle(
              status
            )
          ]}
        >
          {status}
        </Text>
      </View>

      <Text
        style={
          styles.actionDescription
        }
      >
        {action?.actionDescription ||
          "No action description is available."}
      </Text>

      <View
        style={styles.detailCard}
      >
        <Row
          label="Symbol"
          value={
            action?.symbol ||
            "Account"
          }
        />

        <Row
          label="Case"
          value={
            action?.caseId ||
            "Unknown"
          }
        />

        <Row
          label="Broker"
          value={
            action?.broker ||
            "Unknown"
          }
        />

        <Row
          label="Account"
          value={
            action?.accountName ||
            "Unknown"
          }
        />

        <Row
          label="Discrepancy"
          value={
            action?.discrepancyType ||
            "Unknown"
          }
        />

        <Row
          label="Resolution"
          value={
            action?.resolutionLabel ||
            action?.resolutionCode ||
            "Unknown"
          }
        />

        <Row
          label="Priority"
          value={
            action?.priority ||
            "NORMAL"
          }
        />

        <Row
          label="Approval Required"
          value={
            approvalRequired
              ? "Yes"
              : "No"
          }
        />
      </View>

      <View
        style={
          styles.lifecycleCard
        }
      >
        <Text
          style={
            styles.lifecycleTitle
          }
        >
          Action Lifecycle
        </Text>

        <LifecycleRow
          label="Created"
          value={
            formatDate(
              action?.createdAt
            )
          }
        />

        {action?.approvedAt ? (
          <LifecycleRow
            label="Approved"
            value={
              formatDate(
                action.approvedAt
              )
            }
          />
        ) : null}

        {action?.completedAt ? (
          <LifecycleRow
            label="Completed"
            value={
              formatDate(
                action.completedAt
              )
            }
          />
        ) : null}

        {action?.cancelledAt ? (
          <LifecycleRow
            label="Cancelled"
            value={
              formatDate(
                action.cancelledAt
              )
            }
          />
        ) : null}

        <LifecycleRow
          label="Updated"
          value={
            formatDate(
              action?.updatedAt
            )
          }
        />
      </View>

      {!terminal ? (
        <View
          style={styles.buttonGroup}
        >
          {approvalRequired &&
          !approved ? (
            <ActionButton
              label="Approve"
              disabled={
                processing
              }
              primary
              onPress={
                onApprove
              }
            />
          ) : null}

          {status ===
            "PLANNED" &&
          (
            !approvalRequired ||
            approved
          ) ? (
            <ActionButton
              label="Start"
              disabled={
                processing
              }
              primary
              onPress={
                onStart
              }
            />
          ) : null}

          {status ===
            "APPROVED" ? (
            <ActionButton
              label="Start"
              disabled={
                processing
              }
              primary
              onPress={
                onStart
              }
            />
          ) : null}

          {status ===
            "IN_PROGRESS" ||
          status ===
            "APPROVED" ||
          (
            status ===
              "PLANNED" &&
            !approvalRequired
          ) ? (
            <ActionButton
              label="Complete"
              disabled={
                processing
              }
              onPress={
                onComplete
              }
            />
          ) : null}

          <ActionButton
            label="Cancel"
            disabled={
              processing
            }
            danger
            onPress={
              onCancel
            }
          />

          {processing ? (
            <ActivityIndicator
              color="#67e8f9"
              style={{
                marginTop: 10
              }}
            />
          ) : null}
        </View>
      ) : null}

      {action?.notes ? (
        <View
          style={styles.notesCard}
        >
          <Text
            style={styles.notesLabel}
          >
            Notes
          </Text>

          <Text
            style={styles.notesText}
          >
            {action.notes}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  disabled,
  primary,
  danger,
  onPress
}) {
  return (
    <Pressable
      disabled={disabled}
      style={[
        styles.actionButton,

        primary &&
          styles.actionButtonPrimary,

        danger &&
          styles.actionButtonDanger,

        disabled &&
          styles.disabledButton
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.actionButtonText,

          primary &&
            styles.actionButtonTextPrimary,

          danger &&
            styles.actionButtonTextDanger
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Metric({
  label,
  value
}) {
  return (
    <View
      style={styles.metric}
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

function Row({
  label,
  value
}) {
  return (
    <View
      style={styles.row}
    >
      <Text
        style={styles.rowLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.rowValue}
      >
        {String(
          value ?? "N/A"
        )}
      </Text>
    </View>
  );
}

function LifecycleRow({
  label,
  value
}) {
  return (
    <View
      style={styles.lifecycleRow}
    >
      <Text
        style={
          styles.lifecycleLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.lifecycleValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function formatDate(value) {
  if (!value) {
    return "Not yet";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString(
    "en-US"
  );
}

function actionStatusStyle(
  status
) {
  switch (status) {
    case "COMPLETED":
      return {
        color: "#86efac"
      };

    case "APPROVED":
      return {
        color: "#67e8f9"
      };

    case "IN_PROGRESS":
      return {
        color: "#fde68a"
      };

    case "CANCELLED":
      return {
        color: "#fca5a5"
      };

    case "PLANNED":
      return {
        color: "#facc15"
      };

    default:
      return {
        color: "#cbd5e1"
      };
  }
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#020617"
    },

    content: {
      padding: 22,
      paddingTop: 70,
      paddingBottom: 110
    },

    center: {
      flex: 1,
      backgroundColor:
        "#020617",
      alignItems: "center",
      justifyContent:
        "center",
      padding: 24
    },

    loadingText: {
      color: "#94a3b8",
      marginTop: 14
    },

    eyebrow: {
      color: "#c084fc",
      fontSize: 13,
      fontWeight: "900"
    },

    title: {
      color: "white",
      fontSize: 30,
      fontWeight: "900",
      marginTop: 8
    },

    subtitle: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 8,
      marginBottom: 20
    },

    coachCard: {
      backgroundColor:
        "rgba(147,51,234,.12)",
      borderColor:
        "rgba(147,51,234,.35)",
      borderWidth: 1,
      borderRadius: 22,
      padding: 18
    },

    coachLabel: {
      color: "#c084fc",
      fontWeight: "900"
    },

    coachText: {
      color: "white",
      lineHeight: 22,
      marginTop: 8
    },

    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 18
    },

    metric: {
      width: "47%",
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 18,
      padding: 15
    },

    metricLabel: {
      color: "#94a3b8",
      fontSize: 12
    },

    metricValue: {
      color: "white",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 6
    },

    filterRow: {
      gap: 8,
      paddingVertical: 20
    },

    filterButton: {
      backgroundColor:
        "#1e293b",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14
    },

    filterButtonActive: {
      backgroundColor:
        "#9333ea"
    },

    filterText: {
      color: "#94a3b8",
      fontWeight: "900"
    },

    filterTextActive: {
      color: "white"
    },

    actionCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16
    },

    completedCard: {
      borderColor:
        "rgba(34,197,94,.45)"
    },

    cancelledCard: {
      borderColor:
        "rgba(239,68,68,.40)"
    },

    actionHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 16
    },

    actionTitle: {
      color: "#67e8f9",
      fontSize: 19,
      fontWeight: "900"
    },

    actionCode: {
      color: "#94a3b8",
      fontSize: 11,
      fontWeight: "900",
      marginTop: 4
    },

    status: {
      fontSize: 11,
      fontWeight: "900"
    },

    actionDescription: {
      color: "#cbd5e1",
      lineHeight: 22,
      marginTop: 12
    },

    detailCard: {
      backgroundColor:
        "#020617",
      borderRadius: 14,
      padding: 12,
      marginTop: 14
    },

    row: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 16,
      marginTop: 10
    },

    rowLabel: {
      color: "#94a3b8",
      flex: 1
    },

    rowValue: {
      color: "white",
      fontWeight: "900",
      textAlign: "right",
      flex: 1
    },

    lifecycleCard: {
      backgroundColor:
        "rgba(30,41,59,.70)",
      borderRadius: 14,
      padding: 13,
      marginTop: 14
    },

    lifecycleTitle: {
      color: "#c084fc",
      fontWeight: "900"
    },

    lifecycleRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 14,
      marginTop: 9
    },

    lifecycleLabel: {
      color: "#94a3b8"
    },

    lifecycleValue: {
      color: "#cbd5e1",
      fontSize: 12,
      textAlign: "right"
    },

    buttonGroup: {
      marginTop: 16
    },

    actionButton: {
      backgroundColor:
        "#1e293b",
      borderColor:
        "#334155",
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginTop: 9
    },

    actionButtonPrimary: {
      backgroundColor:
        "#9333ea",
      borderColor:
        "#9333ea"
    },

    actionButtonDanger: {
      backgroundColor:
        "rgba(239,68,68,.10)",
      borderColor:
        "rgba(239,68,68,.40)"
    },

    actionButtonText: {
      color: "#67e8f9",
      fontWeight: "900",
      textAlign: "center"
    },

    actionButtonTextPrimary: {
      color: "white"
    },

    actionButtonTextDanger: {
      color: "#fca5a5"
    },

    disabledButton: {
      opacity: 0.55
    },

    notesCard: {
      backgroundColor:
        "rgba(34,197,94,.08)",
      borderRadius: 12,
      padding: 12,
      marginTop: 14
    },

    notesLabel: {
      color: "#86efac",
      fontSize: 11,
      fontWeight: "900"
    },

    notesText: {
      color: "#cbd5e1",
      lineHeight: 20,
      marginTop: 5
    },

    emptyCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18
    },

    emptyTitle: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900"
    },

    emptyText: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 8
    },

    emptyHint: {
      color: "#64748b",
      lineHeight: 20,
      marginTop: 10
    },

    protectionCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",
      borderColor:
        "rgba(245,158,11,.35)",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 18
    },

    protectionTitle: {
      color: "#fde68a",
      fontSize: 18,
      fontWeight: "900"
    },

    protectionText: {
      color: "#fef3c7",
      lineHeight: 22,
      marginTop: 8
    },

    primaryButton: {
      backgroundColor:
        "#9333ea",
      padding: 17,
      borderRadius: 18,
      marginTop: 22
    },

    primaryButtonText: {
      color: "white",
      fontWeight: "900",
      textAlign: "center"
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",
      padding: 17,
      borderRadius: 18,
      marginTop: 12
    },

    secondaryButtonText: {
      color: "#67e8f9",
      fontWeight: "900",
      textAlign: "center"
    },

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",
      borderColor:
        "rgba(239,68,68,.35)",
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16
    },

    errorText: {
      color: "#fca5a5"
    }
  });
