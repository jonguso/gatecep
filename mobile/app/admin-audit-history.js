import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { router } from "expo-router";

import {
  MobileHeader,
  MobileScreen
} from "../src/components/mobile/MobileUI";

import { useAuth } from "../src/features/auth/hooks/useAuth";

import {
  loadAdminAuditEvents
} from "../src/features/admin/api/adminApi";

function formatTimestamp(value) {
  if (!value) {
    return "Timestamp unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Timestamp unavailable";
  }

  return date.toLocaleString();
}

function stateRole(state) {
  const role =
    String(state?.role || "")
      .trim()
      .toUpperCase();

  return role || null;
}

function stateStatus(state) {
  const status =
    String(state?.status || "")
      .trim()
      .toUpperCase();

  return status || null;
}

export default function AdminAuditHistoryScreen() {
  const {
    accessToken,
    loading: authLoading
  } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    if (!accessToken) {
      setEvents([]);
      setError("Authentication is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await loadAdminAuditEvents(
          accessToken,
          {
            limit: 100
          }
        );

      setEvents(result);
    } catch (loadError) {
      setEvents([]);

      if (loadError?.status === 401) {
        setError(
          "Your authenticated session is no longer valid."
        );
      } else if (loadError?.status === 403) {
        setError(
          "This account is not authorized to view administrative audit history."
        );
      } else {
        setError(
          loadError?.message ||
          "Administrative audit history could not be loaded."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!authLoading) {
      loadHistory();
    }
  }, [authLoading, loadHistory]);

  return (
    <MobileScreen testID="gatecep-admin-audit-history">
      <MobileHeader
        title="Administrative Audit History"
        subtitle="Server-authorized, read-only administrative evidence."
        onBack={() => router.back()}
        actionLabel="Users"
        onAction={() => router.replace("/admin-users")}
      />

      {authLoading || loading ? (
        <View style={styles.statusCard}>
          <ActivityIndicator />

          <Text style={styles.statusText}>
            Loading administrative audit history…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Audit history unavailable
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={loadHistory}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Administrative events
            </Text>

            <Text style={styles.summaryValue}>
              {events.length}
            </Text>

            <Text style={styles.summaryDetail}>
              Newest first · server-authorized · read only
            </Text>
          </View>

          <View style={styles.list}>
            {events.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No administrative audit events are available.
                </Text>
              </View>
            ) : (
              events.map((event, index) => {
                const beforeRole =
                  stateRole(event.beforeState);

                const afterRole =
                  stateRole(event.afterState);

                const beforeStatus =
                  stateStatus(event.beforeState);

                const afterStatus =
                  stateStatus(event.afterState);

                return (
                  <View
                    key={
                      event.id ||
                      `${event.createdAt || "audit"}-${index}`
                    }
                    testID={`admin-audit-event-${index}`}
                    style={styles.eventCard}
                  >
                    <Text style={styles.action}>
                      {event.action ||
                        "ADMINISTRATIVE_EVENT"}
                    </Text>

                    <Text style={styles.timestamp}>
                      {formatTimestamp(event.createdAt)}
                    </Text>

                    <View style={styles.metaBlock}>
                      <Text style={styles.metaText}>
                        Actor:{" "}
                        {event.actorUserId ||
                          "Unavailable"}
                      </Text>

                      <Text style={styles.metaText}>
                        Target:{" "}
                        {event.targetType ||
                          "Unavailable"}
                        {event.targetId
                          ? ` · ${event.targetId}`
                          : ""}
                      </Text>
                    </View>

                    {beforeRole || afterRole ? (
                      <View style={styles.transitionBlock}>
                        <Text style={styles.transitionLabel}>
                          Role
                        </Text>

                        <Text style={styles.transition}>
                          {beforeRole || "N/A"}
                          {"  →  "}
                          {afterRole || "N/A"}
                        </Text>
                      </View>
                    ) : null}

                    {beforeStatus || afterStatus ? (
                      <View style={styles.transitionBlock}>
                        <Text style={styles.transitionLabel}>
                          Account status
                        </Text>

                        <Text
                          testID={`admin-audit-status-transition-${index}`}
                          style={styles.transition}
                        >
                          {beforeStatus || "N/A"}
                          {"  →  "}
                          {afterStatus || "N/A"}
                        </Text>
                      </View>
                    ) : null}

                    {event.reason ? (
                      <View style={styles.reasonBlock}>
                        <Text style={styles.reasonLabel}>
                          Administrative reason
                        </Text>

                        <Text style={styles.reasonText}>
                          {event.reason}
                        </Text>
                      </View>
                    ) : null}

                    <Text style={styles.boundaryText}>
                      Persisted administrative evidence.
                      This history is observational and
                      cannot be edited or cleared here.
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    minHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20
  },

  statusText: {
    color: "#94a3b8",
    fontSize: 13
  },

  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,.35)",
    backgroundColor: "rgba(239,68,68,.08)",
    padding: 18
  },

  errorTitle: {
    color: "#fca5a5",
    fontSize: 18,
    fontWeight: "900"
  },

  errorText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8
  },

  retryButton: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#475569"
  },

  retryText: {
    color: "#e2e8f0",
    fontWeight: "900"
  },

  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,.32)",
    backgroundColor: "rgba(34,211,238,.08)",
    padding: 16,
    marginBottom: 14
  },

  summaryLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },

  summaryValue: {
    color: "#67e8f9",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4
  },

  summaryDetail: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 4
  },

  list: {
    gap: 10
  },

  eventCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
    padding: 14
  },

  action: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },

  timestamp: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 4
  },

  metaBlock: {
    marginTop: 12,
    gap: 4
  },

  metaText: {
    color: "#94a3b8",
    fontSize: 11
  },

  transitionBlock: {
    marginTop: 12
  },

  transitionLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },

  transition: {
    color: "#67e8f9",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4
  },

  reasonBlock: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 11
  },

  reasonLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },

  reasonText: {
    color: "#e2e8f0",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5
  },

  boundaryText: {
    color: "#64748b",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 12
  },

  emptyCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
    padding: 18
  },

  emptyText: {
    color: "#94a3b8",
    fontSize: 13
  }
});
